-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_storeId_fkey";

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "storeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
