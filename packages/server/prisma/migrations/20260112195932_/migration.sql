/*
  Warnings:

  - A unique constraint covering the columns `[user_id,question_id]` on the table `user_answers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_answers_question_id_user_id_idx";

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "started_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "view_logs" ADD COLUMN     "started_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_user_id_question_id_key" ON "user_answers"("user_id", "question_id");
