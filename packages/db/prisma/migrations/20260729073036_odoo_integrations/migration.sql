-- CreateEnum
CREATE TYPE "OdooModuleId" AS ENUM ('crm', 'documents', 'rh', 'facturation', 'projets');

-- CreateTable
CREATE TABLE "odoo_connections" (
    "society" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "database" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "api_key_encrypted" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "last_connected_at" TIMESTAMP(3),
    "last_error" TEXT,
    "selected_modules" "OdooModuleId"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odoo_connections_pkey" PRIMARY KEY ("society")
);

-- CreateTable
CREATE TABLE "odoo_field_mappings" (
    "id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "module_id" "OdooModuleId" NOT NULL,
    "odoo_field" TEXT NOT NULL,
    "atfm_label" TEXT NOT NULL,

    CONSTRAINT "odoo_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odoo_migration_reports" (
    "id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "module_id" "OdooModuleId" NOT NULL,
    "available" INTEGER NOT NULL,
    "imported" INTEGER NOT NULL,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "errors" TEXT[],
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odoo_migration_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "odoo_field_mappings_society_module_id_odoo_field_key" ON "odoo_field_mappings"("society", "module_id", "odoo_field");

-- CreateIndex
CREATE INDEX "odoo_migration_reports_society_idx" ON "odoo_migration_reports"("society");

-- AddForeignKey
ALTER TABLE "odoo_field_mappings" ADD CONSTRAINT "odoo_field_mappings_society_fkey" FOREIGN KEY ("society") REFERENCES "odoo_connections"("society") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odoo_migration_reports" ADD CONSTRAINT "odoo_migration_reports_society_fkey" FOREIGN KEY ("society") REFERENCES "odoo_connections"("society") ON DELETE CASCADE ON UPDATE CASCADE;
