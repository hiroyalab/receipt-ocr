# 家計簿アプリ

レシートを撮影するだけで家計を管理できるWebアプリです。

## 技術スタック

| 役割 | サービス |
|------|---------|
| フロントエンド・ホスティング | Vercel |
| OCR | Gemini API（2.5 Flash） |
| データベース | Supabase（PostgreSQL） |
| 認証 | ユーザー名によるシンプル認証 |

## ローカル開発

```bash
cd frontend
npm install
npm run dev
```

OCR エンドポイント（`/api/ocr`）も含めてローカルで動かす場合は Vercel CLI を使います。

```bash
npm install -g vercel
vercel dev
```

### 環境変数

`frontend/.env.local` を作成して以下を設定します。

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
GEMINI_API_KEY=AIza...
```

## デプロイ

`main` への push で Vercel が自動デプロイします。

Vercel の環境変数に `VITE_SUPABASE_URL`・`VITE_SUPABASE_ANON_KEY`・`GEMINI_API_KEY` を設定してください。

## DB マイグレーション

`supabase/migrations/` 以下の SQL を Supabase の SQL Editor で順番に実行してください。
