import io
import os
import re
import tempfile
from datetime import date

from PIL import Image, ImageOps
from rembg import remove

os.environ.setdefault("FLAGS_use_mkldnn", "0")
os.environ.setdefault("FLAGS_enable_pir_api", "0")

_ocr = None
_MAX_PIXELS = 1920


def get_ocr():
    global _ocr
    if _ocr is None:
        import paddle
        paddle.set_flags({"FLAGS_use_mkldnn": False, "FLAGS_enable_pir_api": False})
        from paddleocr import PaddleOCR
        _ocr = PaddleOCR(
            lang="japan",
            ocr_version="PP-OCRv5",
            use_textline_orientation=True,
            text_det_thresh=0.3,
            text_det_box_thresh=0.5,
            text_rec_score_thresh=0.0,
        )
    return _ocr


def _clean_name(s: str, price_re: re.Pattern) -> str:
    s = re.sub(r"^\d{3,}[*＊]\s*", "", s)
    s = re.sub(r"^外\d?\s+", "", s)
    s = re.sub(r"\s*外\d?$", "", s)
    s = re.sub(r"^\d{3,}\s+", "", s)
    s = price_re.sub("", s)
    return s.strip()


def _has_meaningful_chars(s: str) -> bool:
    return bool(re.search(r"[ぁ-んァ-ン一-龥a-zA-Zａ-ｚＡ-Ｚ]", s))


def parse_receipt_lines(lines: list[str]) -> dict:
    items = []
    total = None
    receipt_date = None
    store = "不明"
    pending_name = None
    pending_total = False

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

        dm = date_re.search(s)
        if dm and receipt_date is None:
            y, mo, d = dm.group(1), dm.group(2), dm.group(3)
            if len(y) == 2:
                y = "20" + y
            try:
                receipt_date = f"{y}-{int(mo):02d}-{int(d):02d}"
            except Exception:
                pass

        if re.search(r"合計", s) and not re.search(r"(小計|外税計|税合計)", s):
            pm = price_re.search(s)
            if pm:
                total = parse_price(pm)
                pending_total = False
            else:
                pending_total = True
            pending_name = None
            continue

        if any(kw in s for kw in skip_keywords):
            pending_name = None
            continue

        if jan_re.match(s):
            continue

        if qty_re.search(s):
            pm = price_re.search(s)
            if pm and pending_name:
                price = parse_price(pm)
                if 0 < price < 100000:
                    items.append({"name": pending_name, "price": price})
                pending_name = None
            continue

        pm = price_re.search(s)
        if pm:
            price = parse_price(pm)

            if pending_total:
                total = price
                pending_total = False
                pending_name = None
                continue

            name = _clean_name(s, price_re)

            if not _has_meaningful_chars(name) and pending_name:
                name = pending_name

            if name and _has_meaningful_chars(name) and 0 < price < 100000:
                items.append({"name": name, "price": price})
            pending_name = None
        else:
            name = _clean_name(s, price_re)
            pending_name = name if _has_meaningful_chars(name) else None

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


def _preprocess(file_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(file_bytes))
    img = ImageOps.exif_transpose(img)

    if max(img.size) > _MAX_PIXELS:
        img.thumbnail((_MAX_PIXELS, _MAX_PIXELS), Image.LANCZOS)

    removed = remove(img)
    bbox = removed.split()[3].getbbox()
    if bbox:
        cropped = removed.crop(bbox)
        white_bg = Image.new("RGB", cropped.size, (255, 255, 255))
        white_bg.paste(cropped, mask=cropped.split()[3])
        img = white_bg
    else:
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


async def analyze_image(file_bytes: bytes) -> dict:
    import base64
    file_bytes = _preprocess(file_bytes)
    image_base64 = base64.b64encode(file_bytes).decode()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        ocr = get_ocr()
        result = ocr.predict(tmp_path)
        lines = []
        for res in (result or []):
            for text, conf in zip(res["rec_texts"], res["rec_scores"]):
                if conf > 0.5:
                    lines.append(text)

        parsed = parse_receipt_lines(lines)
        return {"success": True, "raw_lines": lines, "image_base64": image_base64, **parsed}
    finally:
        os.unlink(tmp_path)
