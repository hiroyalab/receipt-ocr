# DB

PostgreSQL + Prisma によるデータ管理層です。

## 構成

```
db/
├── prisma/
│   └── schema.prisma   # Prismaスキーマ定義
├── docker-compose.yml  # PostgreSQL コンテナ設定
├── .env.example        # 接続URL例
└── README.md
```

## セットアップ

### 1. コンテナ起動

ルートの `docker-compose.yml` でまとめて起動します。

```bash
docker compose up -d
```

DB 単体で起動したい場合：

```bash
docker compose up -d db
```

### 2. 環境変数を設定

```bash
cp db/.env.example .env
```

`.env` はリポジトリルートに置き、Prisma が参照できるようにします。

### 3. マイグレーション実行

```bash
npx prisma migrate dev --schema=db/prisma/schema.prisma
```

### 4. Prisma Client 生成

```bash
npx prisma generate --schema=db/prisma/schema.prisma
```

## テーブル設計

### Category（カテゴリ）

食費・日用品・交通費などの支出カテゴリ。`isDefault: true` のレコードはシステム初期値。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| name | String | カテゴリ名（UNIQUE） |
| color | String? | HEXカラーコード |
| icon | String? | アイコン識別子 |
| isDefault | Boolean | システムデフォルトフラグ |
| createdAt | DateTime | |

---

### Receipt（レシート）

OCR スキャン時の元データを保持。ユーザーが支出情報を編集しても原本が残る。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| imagePath | String | 保存画像パス |
| ocrRawLines | Json | OCR 生テキスト配列 |
| ocrStore | String? | OCR 抽出した店名 |
| ocrDate | Date? | OCR 抽出した日付 |
| scannedAt | DateTime | スキャン日時 |

---

### Expense（支出）

1 レシートまたは手動入力 = 1 支出レコード。手動入力の場合 `receiptId` は null。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| receiptId | String? | FK → Receipt（手動入力は null）|
| categoryId | String | FK → Category |
| storeName | String? | 店名 |
| expenseDate | Date | 支出日 |
| totalAmount | Int | 合計金額（円）|
| memo | String? | メモ |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### ExpenseItem（支出明細）

Expense に紐づく商品レベルの明細。Expense 削除時に Cascade 削除される。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| expenseId | String | FK → Expense |
| name | String | 商品名 |
| price | Int | 金額（円）|
| quantity | Int | 数量（デフォルト 1）|
| createdAt | DateTime | |

---

### Budget（月別予算）

カテゴリ × 年月でユニーク制約。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| categoryId | String | FK → Category |
| yearMonth | String | YYYY-MM 形式 |
| amount | Int | 予算金額（円）|
| createdAt | DateTime | |
| updatedAt | DateTime | |

## ER 図

```
Category ──< Expense >── Receipt
    │             │
    └──< Budget   └──< ExpenseItem
```

## よく使うコマンド

```bash
# コンテナ停止（ルートから）
docker compose down

# データも含めて完全削除
docker compose down -v

# Prisma Studio（GUI でデータ確認）
npx prisma studio --schema=db/prisma/schema.prisma
```
