/*
  Warnings:

  - You are about to drop the column `currentCompany` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `currentProject` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `currentCompany` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `currentProject` on the `User` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "currentCompany",
DROP COLUMN "currentProject",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "currentCompany",
DROP COLUMN "currentProject",
ADD COLUMN     "currentProjectId" TEXT;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_ownerId_archived_idx" ON "Project"("ownerId", "archived");

-- CreateIndex
CREATE INDEX "Task_userId_projectId_idx" ON "Task"("userId", "projectId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentProjectId_fkey" FOREIGN KEY ("currentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
