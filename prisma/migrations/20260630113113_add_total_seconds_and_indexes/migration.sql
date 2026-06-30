-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "totalSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Task_userId_updatedAt_idx" ON "Task"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- CreateIndex
CREATE INDEX "TaskTime_taskId_from_idx" ON "TaskTime"("taskId", "from");

-- Backfill: populate totalSeconds from existing TaskTime sessions
UPDATE "Task" t
SET "totalSeconds" = COALESCE(
  (SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(tt."to", NOW()) - tt."from")))
   FROM "TaskTime" tt WHERE tt."taskId" = t.id),
  0
);
