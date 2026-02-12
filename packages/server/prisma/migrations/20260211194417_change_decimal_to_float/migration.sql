/*
  Warnings:

  - You are about to drop the column `message_text` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `message_type` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `read_date` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `send_date` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `notifications` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to alter the column `amount` on the `user_points` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to drop the column `answers_count` on the `view_logs` table. All the data in the column will be lost.
  - You are about to drop the column `participation_percent` on the `view_logs` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `view_logs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripe_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content` to the `chat_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('COIN', 'DIAMOND');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'WINNER_PAYOUT';

-- DropForeignKey
ALTER TABLE "view_logs" DROP CONSTRAINT "view_logs_game_id_fkey";

-- DropIndex
DROP INDEX "view_logs_user_id_host_id_duration_idx";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "message_text",
DROP COLUMN "message_type",
DROP COLUMN "status",
ADD COLUMN     "content" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "game_participants" ALTER COLUMN "score" SET DEFAULT 0.00,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "content",
DROP COLUMN "read_date",
DROP COLUMN "send_date",
DROP COLUMN "type",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "currency" "CurrencyType" NOT NULL DEFAULT 'COIN',
ADD COLUMN     "game_id" TEXT,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "user_answers" ALTER COLUMN "wager" SET DEFAULT 0.00,
ALTER COLUMN "wager" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "user_points" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isFirstPurchase" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 1000.00;

-- AlterTable
ALTER TABLE "view_logs" DROP COLUMN "answers_count",
DROP COLUMN "participation_percent",
DROP COLUMN "started_at",
ALTER COLUMN "game_id" DROP NOT NULL,
ALTER COLUMN "duration" SET DEFAULT 0;

-- DropEnum
DROP TYPE "MessageStatus";

-- DropEnum
DROP TYPE "MessageType";

-- DropEnum
DROP TYPE "NotificationType";

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "view_logs" ADD CONSTRAINT "view_logs_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
