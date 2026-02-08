-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ai_key_mode" TEXT NOT NULL DEFAULT 'personal';

-- AlterTable
ALTER TABLE "ai_usage" ADD COLUMN     "tokens_used" INTEGER,
ADD COLUMN     "query_type" TEXT;

-- CreateIndex
CREATE INDEX "ai_usage_user_id_timestamp_idx" ON "ai_usage"("user_id", "timestamp");

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_config_key_key" ON "app_config"("key");
