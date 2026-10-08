/*
  Warnings:

  - You are about to drop the column `brandId` on the `Campaign` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_brandId_fkey";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "brandId",
ADD COLUMN     "brandPageId" TEXT;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandPageId_fkey" FOREIGN KEY ("brandPageId") REFERENCES "Brand"("pageId") ON DELETE SET NULL ON UPDATE CASCADE;
