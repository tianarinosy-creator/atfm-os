-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('actif', 'suspendu', 'clos');

-- CreateEnum
CREATE TYPE "TaskColumn" AS ENUM ('todo', 'inprogress', 'review', 'done');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "society" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'actif',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "budget" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "column" "TaskColumn" NOT NULL DEFAULT 'todo',
    "sprint" TEXT,
    "assignee_person_id" TEXT,
    "dueDate" TIMESTAMP(3),
    "timeLoggedH" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_checklist_items" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_comments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "author_person_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_expenses" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_risks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "mitigation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ouvert',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_risks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_society_idx" ON "projects"("society");

-- CreateIndex
CREATE INDEX "project_members_person_id_idx" ON "project_members"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_person_id_key" ON "project_members"("project_id", "person_id");

-- CreateIndex
CREATE INDEX "project_tasks_project_id_column_idx" ON "project_tasks"("project_id", "column");

-- CreateIndex
CREATE INDEX "project_task_checklist_items_task_id_idx" ON "project_task_checklist_items"("task_id");

-- CreateIndex
CREATE INDEX "project_task_comments_task_id_idx" ON "project_task_comments"("task_id");

-- CreateIndex
CREATE INDEX "project_expenses_project_id_idx" ON "project_expenses"("project_id");

-- CreateIndex
CREATE INDEX "project_risks_project_id_idx" ON "project_risks"("project_id");

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("person_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assignee_person_id_fkey" FOREIGN KEY ("assignee_person_id") REFERENCES "people"("person_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_checklist_items" ADD CONSTRAINT "project_task_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_comments" ADD CONSTRAINT "project_task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_comments" ADD CONSTRAINT "project_task_comments_author_person_id_fkey" FOREIGN KEY ("author_person_id") REFERENCES "people"("person_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_risks" ADD CONSTRAINT "project_risks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
