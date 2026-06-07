import os
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

import paddle
paddle.set_flags({"FLAGS_use_mkldnn": False, "FLAGS_enable_pir_api": False})

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from paddleocr import PaddleOCR
import re
import tempfile
import os
from datetime import date

app = FastAPI(title="レシートOCR API", version="1.0.0")
ocr = PaddleOCR(
    lang="japan",
    ocr_version="PP-OCRv5",
    use_textline_orientation=True,
    text_det_thresh=0.3,
    text_det_box_thresh=0.5,
    text_rec_score_thresh=0.0,
)


def _clean_name(s: str, price_re: re.Pattern) -> str:
    s = re.sub(r"^\d{3,}[*＊]\s*", "", s)  # コードプレフィックス (000221*)
    s = re.sub(r"^外\d?\s+", "", s)         # 行頭の税区分 (外8)
    s = re.sub(r"\s*外\d?$", "", s)         # 行末の税区分
    s = re.sub(r"^\d{3,}\s+", "", s)        # 行頭の数字コード
    s = price_re.sub("", s)                 # 価格部分
    return s.strip()


def _has_meaningful_chars(s: str) -> bool:
    return bool(re.search(r"[ぁ-んァ-ン一-龥a-zA-Zａ-ｚＡ-Ｚ]", s))


def parse_receipt_lines(lines: list[str]) -> dict:
    items = []
    total = None
    receipt_date = None
    store = "不明"
    pending_name = None
    pending_total = False  # 「合計」行の次行に価格が来るケース

    # カンマ・ピリオド両対応（OCRがカンマをピリオドに誤読するケース）
    price_re = re.compile(r"[¥￥]\s*([\d,.]+)")
    date_re = re.compile(r"(\d{2,4})[年/\-](\d{1,2})[月/\-](\d{1,2})")
    jan_re = re.compile(r"^\d{8,}(JAN)?$")
    qty_re = re.compile(r"\d+コ[×X]\s*単\d+")

    skip_keywords = [
        "小計", "外税", "内税", "税合計", "内消費税", "お釣り", "お預り",
        "ポイント", "割引", "値引", "買上点数", "クレジット", "電子マネー",
        "TEL", "事業者番号", "レシートNo", "店No", "レジ",
    ]

    def parse_price(m: re.Match) -> int:
        return int(m.group(1).replace(",", "").replace(".", ""))

    for line in lines:
        s = line.strip()

        # 日付
        dm = date_re.search(s)
        if dm and receipt_date is None:
            y, m, d = dm.group(1), dm.group(2), dm.group(3)
            if len(y) == 2:
                y = "20" + y
            try:
                receipt_date = f"{y}-{int(m):02d}-{int(d):02d}"
            except Exception:
                pass

        # 合計（小計・外税計・税合計は除外）
        if re.search(r"合計", s) and not re.search(r"(小計|外税計|税合計)", s):
            pm = price_re.search(s)
            if pm:
                total = parse_price(pm)
                pending_total = False
            else:
                pending_total = True  # 次行に価格が来る
            pending_name = None
            continue

        # スキップ行
        if any(kw in s for kw in skip_keywords):
            pending_name = None
            continue

        # JANコード行
        if jan_re.match(s):
            continue

        # 数量行 (2コ×単66 ¥132 or 4コ×単87)
        if qty_re.search(s):
            pm = price_re.search(s)
            if pm and pending_name:
                # 数量行に価格あり → 確定
                price = parse_price(pm)
                if 0 < price < 100000:
                    items.append({"name": pending_name, "price": price})
                pending_name = None
            # 価格なし数量行はpending_nameを維持したまま次行の価格を待つ
            continue

        pm = price_re.search(s)
        if pm:
            price = parse_price(pm)

            # 合計の次行の価格
            if pending_total:
                total = price
                pending_total = False
                pending_name = None
                continue

            name = _clean_name(s, price_re)

            # 名前に意味ある文字がない → pending_nameを使う（価格単体行）
            if not _has_meaningful_chars(name) and pending_name:
                name = pending_name

            if name and _has_meaningful_chars(name) and 0 < price < 100000:
                items.append({"name": name, "price": price})
            pending_name = None
        else:
            # 価格なし行 → 商品名候補として保持
            name = _clean_name(s, price_re)
            pending_name = name if _has_meaningful_chars(name) else None

    # 店名：先頭10行から日本語を含む最初の行
    for line in lines[:10]:
        if re.search(r"[ぁ-んァ-ン一-龥]", line) and not date_re.search(line):
            store = line.strip()
            break

    if total is None and items:
        total = sum(i["price"] for i in items)

    return {
        "store": store,
        "date": receipt_date or str(date.today()),
        "items": items,
        "total": total or 0,
    }


@app.post("/ocr", summary="レシート画像を解析して商品と金額を返す")
async def analyze_receipt(file: UploadFile = File(...)):
    """
    レシート画像をアップロードすると、商品名・金額・合計を JSON で返します。

    - **file**: JPEG / PNG / HEIC などの画像ファイル
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="画像ファイルを送信してください")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        result = ocr.predict(tmp_path)
        lines = []
        for res in (result or []):
            for text, conf in zip(res["rec_texts"], res["rec_scores"]):
                if conf > 0.5:
                    lines.append(text)

        parsed = parse_receipt_lines(lines)
        return JSONResponse(content={
            "success": True,
            "raw_lines": lines,
            **parsed,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok"}
