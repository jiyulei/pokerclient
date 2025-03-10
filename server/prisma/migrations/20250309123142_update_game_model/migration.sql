/*
  Warnings:

  - You are about to drop the column `dealerPosition` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `isGameInProgress` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `isWaiting` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `allIn` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `bet` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `folded` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `isBigBlind` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `isCurrentPlayer` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `isDealer` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `isSmallBlind` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Player` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Card` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Spectator` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_gameId_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_userId_fkey";

-- DropForeignKey
ALTER TABLE "Spectator" DROP CONSTRAINT "Spectator_gameId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "dealerPosition",
DROP COLUMN "isGameInProgress",
DROP COLUMN "isWaiting",
ADD COLUMN     "bigBlindPos" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "communityCards" TEXT[],
ADD COLUMN     "currentPlayerPos" INTEGER,
ADD COLUMN     "currentRoundMaxBet" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dealerPos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "initialChips" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "mainPot" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxPlayers" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sidePots" JSONB,
ADD COLUMN     "smallBlindPos" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'WAITING',
ADD COLUMN     "timeLimit" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "text",
DROP COLUMN "timestamp",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "allIn",
DROP COLUMN "bet",
DROP COLUMN "folded",
DROP COLUMN "isBigBlind",
DROP COLUMN "isCurrentPlayer",
DROP COLUMN "isDealer",
DROP COLUMN "isSmallBlind",
DROP COLUMN "name",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentBet" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hand" TEXT[],
ADD COLUMN     "hasChecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isAllIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFolded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalBet" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRounds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "chips" DROP DEFAULT,
ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "password",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerAccountId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- DropTable
DROP TABLE "Card";

-- DropTable
DROP TABLE "Spectator";

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
