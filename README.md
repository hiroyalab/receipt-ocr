# レシートOCR API

PaddleOCR + FastAPI によるローカル動作のレシート解析APIです。

## セットアップ・起動

### ローカル（開発用）

```bash
cd backend
uv sync
uvicorn main:app --reload --port 8000
```

### Docker（Colima使用・M1 Mac）

**初回のみ: Colima を Rosetta 2 で起動**

```bash
colima stop
colima start --arch x86_64 --vm-type vz --vz-rosetta
```

**ビルド**

```bash
cd backend
docker build --platform linux/amd64 -t receipt-ocr .
```

**起動**

```bash
docker run --platform linux/amd64 -p 8000:8000 -v receipt-ocr-models:/root/.paddleocr receipt-ocr
```

初回起動時に PaddleOCR モデルがダウンロードされます（数分）。2回目以降は `receipt-ocr-models` ボリュームにキャッシュされます。

## エンドポイント

### `POST /ocr`
レシート画像を送信すると、商品名・金額・合計をJSONで返します。

**リクエスト**
```
Content-Type: multipart/form-data
file: <画像ファイル>
```

**レスポンス例**
```json
{
  "success": true,
  "store": "スーパーXX",
  "date": "2026-06-07",
  "items": [
    {"name": "牛乳", "price": 198},
    {"name": "食パン", "price": 245}
  ],
  "total": 443,
  "raw_lines": ["スーパーXX", "牛乳 198", ...]
}
```

**curl例**
```bash
curl -X POST http://localhost:8000/ocr \
  -F "file=@receipt.jpg"
```

### `GET /health`
サーバーの死活確認用。

## Swagger UI
起動後 http://localhost:8000/docs でインタラクティブなAPIドキュメントが確認できます。

## 備考
- 初回起動時にPaddleOCRのモデルが自動ダウンロードされます（約300MB）
- `raw_lines` に生のOCR結果が含まれるので、パース失敗時のデバッグに使えます

## DB

PostgreSQL + Prisma で管理しています。詳細は [db/README.md](db/README.md) を参照してください。

```bash
# backend + db をまとめて起動（ルートから）
docker compose up -d
```
