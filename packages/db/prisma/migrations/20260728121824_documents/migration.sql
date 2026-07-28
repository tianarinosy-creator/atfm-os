-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('Contrats', 'Gouvernance', 'Finance', 'RH', 'Projets');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_person_id" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT 'Public interne',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "signature_status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_society_idx" ON "documents"("society");

-- CreateIndex
CREATE INDEX "documents_society_category_idx" ON "documents"("society", "category");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_person_id_fkey" FOREIGN KEY ("owner_person_id") REFERENCES "people"("person_id") ON DELETE CASCADE ON UPDATE CASCADE;
