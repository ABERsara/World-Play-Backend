-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "status" "GameStatus" NOT NULL DEFAULT 'WAITING';
