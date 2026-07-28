-- CreateEnum
CREATE TYPE "InvestmentStage" AS ENUM ('sourcing', 'pitch', 'dd', 'termsheet', 'investi', 'refuse');

-- CreateTable
CREATE TABLE "startups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "stage" "InvestmentStage" NOT NULL DEFAULT 'sourcing',
    "founder" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "pitch_notes" TEXT NOT NULL DEFAULT '',
    "business_plan_notes" TEXT NOT NULL DEFAULT '',
    "due_diligence_status" TEXT NOT NULL DEFAULT 'Non démarrée',
    "round" TEXT NOT NULL DEFAULT 'Seed',
    "amount_target" INTEGER NOT NULL DEFAULT 0,
    "amount_raised" INTEGER NOT NULL DEFAULT 0,
    "round_status" TEXT NOT NULL DEFAULT 'Non démarrée',
    "valuation_pre_money" INTEGER,
    "valuation_post_money" INTEGER,
    "current_valuation" INTEGER NOT NULL DEFAULT 0,
    "atfm_invested" INTEGER NOT NULL DEFAULT 0,
    "atfm_stake_percentage" INTEGER NOT NULL DEFAULT 0,
    "date_invested" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "startups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_due_diligence_items" (
    "id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "startup_due_diligence_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_cap_table_entries" (
    "id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "investor" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "startup_cap_table_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_investors" (
    "id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contact" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "startup_investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_history_events" (
    "id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "startup_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "startup_due_diligence_items_startup_id_idx" ON "startup_due_diligence_items"("startup_id");

-- CreateIndex
CREATE INDEX "startup_cap_table_entries_startup_id_idx" ON "startup_cap_table_entries"("startup_id");

-- CreateIndex
CREATE INDEX "startup_investors_startup_id_idx" ON "startup_investors"("startup_id");

-- CreateIndex
CREATE INDEX "startup_history_events_startup_id_idx" ON "startup_history_events"("startup_id");

-- AddForeignKey
ALTER TABLE "startup_due_diligence_items" ADD CONSTRAINT "startup_due_diligence_items_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_cap_table_entries" ADD CONSTRAINT "startup_cap_table_entries_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_investors" ADD CONSTRAINT "startup_investors_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_history_events" ADD CONSTRAINT "startup_history_events_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
