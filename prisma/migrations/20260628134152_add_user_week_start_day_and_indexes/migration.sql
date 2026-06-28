-- CreateEnum
CREATE TYPE "WeekStartDay" AS ENUM ('SUNDAY', 'MONDAY', 'SATURDAY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "weekStartDay" "WeekStartDay" NOT NULL DEFAULT 'MONDAY';

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE INDEX "TaskTime_taskId_idx" ON "TaskTime"("taskId");
