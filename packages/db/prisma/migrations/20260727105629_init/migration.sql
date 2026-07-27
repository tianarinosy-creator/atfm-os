-- CreateEnum
CREATE TYPE "AffectationStatus" AS ENUM ('Actif', 'Inactif', 'Suspendu');

-- CreateEnum
CREATE TYPE "CoreEventType" AS ENUM ('EmployeeCreated', 'EmployeeUpdated', 'EmployeeActivated', 'EmployeeDeactivated', 'EmployeeTransferred', 'EmployeeDeleted', 'RoleAssigned', 'RoleRemoved');

-- CreateTable
CREATE TABLE "people" (
    "person_id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "photoUrl" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("person_id")
);

-- CreateTable
CREATE TABLE "affectations" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "manager" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "status" "AffectationStatus" NOT NULL DEFAULT 'Actif',
    "replacement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affectations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "person_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("person_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_events" (
    "id" TEXT NOT NULL,
    "type" "CoreEventType" NOT NULL,
    "person_id" TEXT,
    "personName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_email_key" ON "people"("email");

-- CreateIndex
CREATE INDEX "affectations_society_position_idx" ON "affectations"("society", "position");

-- CreateIndex
CREATE INDEX "affectations_person_id_idx" ON "affectations"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- CreateIndex
CREATE INDEX "roles_person_id_idx" ON "roles"("person_id");

-- CreateIndex
CREATE INDEX "roles_society_role_idx" ON "roles"("society", "role");

-- CreateIndex
CREATE INDEX "core_events_createdAt_idx" ON "core_events"("createdAt");

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("person_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("person_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("person_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_events" ADD CONSTRAINT "core_events_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("person_id") ON DELETE SET NULL ON UPDATE CASCADE;
