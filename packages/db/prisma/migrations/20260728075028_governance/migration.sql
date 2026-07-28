-- CreateEnum
CREATE TYPE "BoardRole" AS ENUM ('presidence', 'direction', 'administrateur');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('ca', 'ag');

-- CreateTable
CREATE TABLE "GovernanceValuation" (
    "society" TEXT NOT NULL,
    "valuation" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceValuation_pkey" PRIMARY KEY ("society")
);

-- CreateTable
CREATE TABLE "governance_board_members" (
    "id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL,
    "title" TEXT NOT NULL,
    "since" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_board_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_shareholders" (
    "id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_shareholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_meetings" (
    "id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "type" "MeetingType" NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Planifiée',
    "agenda" TEXT[],
    "minutes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_resolutions" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "votesAbstain" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'En délibération',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "governance_board_members_society_idx" ON "governance_board_members"("society");

-- CreateIndex
CREATE INDEX "governance_shareholders_society_idx" ON "governance_shareholders"("society");

-- CreateIndex
CREATE INDEX "governance_meetings_society_idx" ON "governance_meetings"("society");

-- CreateIndex
CREATE INDEX "governance_resolutions_meeting_id_idx" ON "governance_resolutions"("meeting_id");

-- AddForeignKey
ALTER TABLE "governance_resolutions" ADD CONSTRAINT "governance_resolutions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "governance_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
