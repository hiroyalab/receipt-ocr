# DB

PostgreSQL + Prisma によるデータ管理層です。

## 構成

```
db/
├── prisma/
│   └── schema.prisma   # Prismaスキーマ定義
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
npx prisma migrate dev
```

### 4. Prisma Client 生成

```bash
npx prisma generate
```

## テーブル設計

### User（ユーザー）

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| email | String | UNIQUE |
| name | String | 表示名 |
| passwordHash | String | ハッシュ化済みパスワード |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### Category（カテゴリ）

食費・日用品・交通費などの支出カテゴリ。`isDefault: true` のレコードはユーザー作成時の初期値。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| userId | String | FK → User |
| name | String | カテゴリ名（userId との複合 UNIQUE）|
| color | String? | HEXカラーコード |
| icon | String? | アイコン識別子 |
| isDefault | Boolean | デフォルトフラグ |
| createdAt | DateTime | |

---

### Receipt（レシート）

OCR スキャン時の元データを保持。ユーザーが支出情報を編集しても原本が残る。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| userId | String | FK → User |
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
| userId | String | FK → User |
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

ユーザー × カテゴリ × 年月で UNIQUE 制約。

| カラム | 型 | 説明 |
|---|---|---|
| id | String (UUID) | PK |
| userId | String | FK → User |
| categoryId | String | FK → Category |
| yearMonth | String | YYYY-MM 形式 |
| amount | Int | 予算金額（円）|
| createdAt | DateTime | |
| updatedAt | DateTime | |

## ER 図

```
User ──< Category ──< Expense >── Receipt
  │          │             │
  ├──< Receipt    └──< Budget   └──< ExpenseItem
  ├──< Expense
  └──< Budget
```

## よく使うコマンド

```bash
# コンテナ停止（ルートから）
docker compose down

# データも含めて完全削除
docker compose down -v

# Prisma Studio（GUI でデータ確認）
npx prisma studio
```
