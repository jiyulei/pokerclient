/*
  Warnings:

  - You are about to drop the column `tableId` on the `Game` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Game_tableId_key";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "tableId";
