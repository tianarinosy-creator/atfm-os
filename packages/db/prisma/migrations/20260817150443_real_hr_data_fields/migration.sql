-- AlterTable
ALTER TABLE "affectations" ADD COLUMN     "salary" INTEGER;

-- AlterTable
ALTER TABLE "people" ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "nationalIdDate" TIMESTAMP(3),
ADD COLUMN     "nationalIdPlace" TEXT;
