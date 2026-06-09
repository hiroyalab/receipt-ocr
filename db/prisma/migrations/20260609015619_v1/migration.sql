-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(36) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" VARCHAR(36) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "store" VARCHAR(200) NOT NULL,
    "date" DATE NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "category" VARCHAR(20) NOT NULL,
    "total" INTEGER NOT NULL,
    "image_base64" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "receipts_username_idx" ON "receipts"("username");

-- CreateIndex
CREATE INDEX "receipts_date_idx" ON "receipts"("date");

-- CreateIndex
CREATE INDEX "receipts_category_idx" ON "receipts"("category");
