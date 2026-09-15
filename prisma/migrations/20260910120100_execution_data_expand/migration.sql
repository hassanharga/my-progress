BEGIN;

-- CreateEnum
CREATE TYPE "DailyPlanOutcome" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED', 'CARRIED', 'RETURNED_TO_BACKLOG');

CREATE TYPE "WorkLogEntryKind" AS ENUM ('PROGRESS', 'NOTE', 'COMPLETION_SUMMARY');

CREATE TYPE "WorkSessionSource" AS ENUM ('TIMER', 'MIGRATED', 'MANUAL_CORRECTION');

-- Add nullable columns first so legacy rows can be reconciled before the
-- ownership and value constraints are installed.
ALTER TABLE "User"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "dailyCapacityMinutes" INTEGER;

ALTER TABLE "Task"
  ADD COLUMN "currentNextStep" TEXT,
  ADD COLUMN "defaultPlannedMinutes" INTEGER,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "TaskTime"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "projectId" TEXT,
  ADD COLUMN "source" "WorkSessionSource",
  ADD COLUMN "originalStartedAt" TIMESTAMP(3),
  ADD COLUMN "originalEndedAt" TIMESTAMP(3),
  ADD COLUMN "correctionReason" TEXT,
  ADD COLUMN "correctedAt" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Ownership cannot be inferred safely. Abort the whole migration transaction
-- and include the offending identifiers instead of guessing a repair.
DO $$
DECLARE
  task_mismatches TEXT;
  active_project_mismatches TEXT;
BEGIN
  SELECT string_agg(
    format('%s:%s->%s:owner=%s', t."id", t."userId", t."projectId", p."ownerId"),
    ', ' ORDER BY t."id"
  )
  INTO task_mismatches
  FROM "Task" t
  JOIN "Project" p ON p."id" = t."projectId"
  WHERE t."userId" <> p."ownerId";

  SELECT string_agg(
    format('%s->%s:owner=%s', u."id", u."currentProjectId", p."ownerId"),
    ', ' ORDER BY u."id"
  )
  INTO active_project_mismatches
  FROM "User" u
  JOIN "Project" p ON p."id" = u."currentProjectId"
  WHERE u."currentProjectId" IS NOT NULL
    AND u."id" <> p."ownerId";

  IF task_mismatches IS NOT NULL OR active_project_mismatches IS NOT NULL THEN
    RAISE EXCEPTION 'ownership preflight failed; tasks=[%]; active-projects=[%]',
      COALESCE(task_mismatches, ''),
      COALESCE(active_project_mismatches, '');
  END IF;
END $$;

-- Backfill direct execution-session ownership only after the preflight passes.
UPDATE "TaskTime" tt
SET
  "userId" = t."userId",
  "projectId" = t."projectId",
  "source" = 'MIGRATED',
  "createdAt" = tt."from",
  "updatedAt" = COALESCE(tt."to", tt."from")
FROM "Task" t
WHERE t."id" = tt."taskId";

-- Preserve invalid historical timestamps before normalizing the interval.
UPDATE "TaskTime"
SET
  "originalStartedAt" = "from",
  "originalEndedAt" = "to",
  "to" = "from",
  "correctionReason" = 'migration-repair:end-before-start',
  "correctedAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "to" IS NOT NULL
  AND "to" < "from";

-- RESUMED was historically stored as a state. It is now a START event applied
-- to a paused task, while the label remains temporarily for compatibility.
UPDATE "Task"
SET "status" = 'IN_PROGRESS'
WHERE "status" = 'RESUMED';

-- Terminal tasks cannot own an open session.
UPDATE "TaskTime" tt
SET
  "to" = GREATEST(tt."from", t."updatedAt"),
  "correctionReason" = 'migration-repair:terminal-open-session',
  "correctedAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Task" t
WHERE t."id" = tt."taskId"
  AND tt."to" IS NULL
  AND t."status" IN ('COMPLETED', 'CANCELLED');

-- For each project, keep the greatest (start, id) open session. Close every
-- older session at the kept session's start, never before its own start.
WITH ranked_open AS (
  SELECT
    tt."id",
    first_value(tt."from") OVER (
      PARTITION BY tt."projectId"
      ORDER BY tt."from" DESC, tt."id" DESC
    ) AS kept_start,
    row_number() OVER (
      PARTITION BY tt."projectId"
      ORDER BY tt."from" DESC, tt."id" DESC
    ) AS open_rank
  FROM "TaskTime" tt
  WHERE tt."to" IS NULL
)
UPDATE "TaskTime" tt
SET
  "to" = GREATEST(tt."from", ranked_open.kept_start),
  "correctionReason" = 'migration-repair:duplicate-project-open-session',
  "correctedAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
FROM ranked_open
WHERE ranked_open."id" = tt."id"
  AND ranked_open.open_rank > 1;

-- Derive the five-value execution state from authoritative session history.
UPDATE "Task" t
SET "status" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "TaskTime" tt
    WHERE tt."taskId" = t."id" AND tt."to" IS NULL
  ) THEN 'IN_PROGRESS'::"TaskStatus"
  WHEN EXISTS (
    SELECT 1 FROM "TaskTime" tt
    WHERE tt."taskId" = t."id"
  ) THEN 'PAUSED'::"TaskStatus"
  ELSE 'READY'::"TaskStatus"
END
WHERE t."status" NOT IN ('COMPLETED', 'CANCELLED');

UPDATE "Task"
SET "currentNextStep" = "todo"
WHERE "todo" IS NOT NULL
  AND btrim("todo") <> '';

UPDATE "Task"
SET "completedAt" = "updatedAt"
WHERE "status" = 'COMPLETED' AND "completedAt" IS NULL;

UPDATE "Task"
SET "cancelledAt" = "updatedAt"
WHERE "status" = 'CANCELLED' AND "cancelledAt" IS NULL;

-- CreateTable
CREATE TABLE "DailyPlanItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "planDate" DATE NOT NULL,
  "plannedMinutes" INTEGER,
  "position" INTEGER NOT NULL,
  "outcome" "DailyPlanOutcome" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkLogEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "sessionId" TEXT,
  "kind" "WorkLogEntryKind" NOT NULL DEFAULT 'NOTE',
  "content" TEXT NOT NULL,
  "nextStepSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkLogEntry_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WorkLogEntry" (
  "id", "userId", "projectId", "taskId", "kind", "content",
  "nextStepSnapshot", "createdAt", "updatedAt"
)
SELECT
  'legacy-progress-' || t."id",
  t."userId",
  t."projectId",
  t."id",
  'PROGRESS',
  t."progress",
  t."currentNextStep",
  t."updatedAt",
  t."updatedAt"
FROM "Task" t
WHERE t."progress" IS NOT NULL
  AND btrim(t."progress") <> ''
ON CONFLICT ("id") DO NOTHING;

-- Closed sessions are authoritative for cached task duration.
UPDATE "Task" t
SET "totalSeconds" = COALESCE((
  SELECT SUM(EXTRACT(EPOCH FROM (tt."to" - tt."from")))
  FROM "TaskTime" tt
  WHERE tt."taskId" = t."id"
    AND tt."to" IS NOT NULL
), 0);

ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'READY';

ALTER TABLE "TaskTime"
  ALTER COLUMN "userId" SET NOT NULL,
  ALTER COLUMN "projectId" SET NOT NULL,
  ALTER COLUMN "source" SET NOT NULL,
  ALTER COLUMN "source" SET DEFAULT 'TIMER',
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- Value constraints not expressible in Prisma Schema Language.
ALTER TABLE "User"
  ADD CONSTRAINT "User_dailyCapacityMinutes_check"
  CHECK ("dailyCapacityMinutes" IS NULL OR "dailyCapacityMinutes" >= 0);

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_defaultPlannedMinutes_check"
  CHECK ("defaultPlannedMinutes" IS NULL OR "defaultPlannedMinutes" >= 0);

ALTER TABLE "TaskTime"
  ADD CONSTRAINT "TaskTime_interval_check"
  CHECK ("to" IS NULL OR "to" >= "from");

ALTER TABLE "DailyPlanItem"
  ADD CONSTRAINT "DailyPlanItem_plannedMinutes_check"
    CHECK ("plannedMinutes" IS NULL OR "plannedMinutes" >= 0),
  ADD CONSTRAINT "DailyPlanItem_position_check"
    CHECK ("position" >= 0);

-- Replace single-column ownership links with composite owner-aware links.
ALTER TABLE "User" DROP CONSTRAINT "User_currentProjectId_fkey";
ALTER TABLE "Task" DROP CONSTRAINT "Task_projectId_fkey";
ALTER TABLE "TaskTime" DROP CONSTRAINT "TaskTime_taskId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_ownerId_key" ON "Project"("id", "ownerId");
CREATE UNIQUE INDEX "Task_id_userId_projectId_key" ON "Task"("id", "userId", "projectId");
CREATE UNIQUE INDEX "TaskTime_id_taskId_userId_projectId_key" ON "TaskTime"("id", "taskId", "userId", "projectId");
CREATE UNIQUE INDEX "TaskTime_one_open_per_task" ON "TaskTime"("taskId") WHERE "to" IS NULL;
CREATE UNIQUE INDEX "TaskTime_one_open_per_project" ON "TaskTime"("projectId") WHERE "to" IS NULL;
CREATE INDEX "TaskTime_userId_from_idx" ON "TaskTime"("userId", "from");
CREATE INDEX "TaskTime_projectId_from_idx" ON "TaskTime"("projectId", "from");
CREATE UNIQUE INDEX "DailyPlanItem_userId_taskId_planDate_key" ON "DailyPlanItem"("userId", "taskId", "planDate");
CREATE INDEX "DailyPlanItem_userId_planDate_position_idx" ON "DailyPlanItem"("userId", "planDate", "position");
CREATE INDEX "DailyPlanItem_projectId_planDate_idx" ON "DailyPlanItem"("projectId", "planDate");
CREATE INDEX "WorkLogEntry_userId_createdAt_idx" ON "WorkLogEntry"("userId", "createdAt");
CREATE INDEX "WorkLogEntry_taskId_createdAt_idx" ON "WorkLogEntry"("taskId", "createdAt");
CREATE INDEX "WorkLogEntry_sessionId_idx" ON "WorkLogEntry"("sessionId");

-- AddForeignKey
ALTER TABLE "User"
  ADD CONSTRAINT "User_currentProjectId_id_fkey"
  FOREIGN KEY ("currentProjectId", "id") REFERENCES "Project"("id", "ownerId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_projectId_userId_fkey"
  FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "ownerId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskTime"
  ADD CONSTRAINT "TaskTime_taskId_userId_projectId_fkey"
  FOREIGN KEY ("taskId", "userId", "projectId") REFERENCES "Task"("id", "userId", "projectId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskTime"
  ADD CONSTRAINT "TaskTime_projectId_userId_fkey"
  FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "ownerId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DailyPlanItem"
  ADD CONSTRAINT "DailyPlanItem_taskId_userId_projectId_fkey"
  FOREIGN KEY ("taskId", "userId", "projectId") REFERENCES "Task"("id", "userId", "projectId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DailyPlanItem"
  ADD CONSTRAINT "DailyPlanItem_projectId_userId_fkey"
  FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "ownerId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkLogEntry"
  ADD CONSTRAINT "WorkLogEntry_taskId_userId_projectId_fkey"
  FOREIGN KEY ("taskId", "userId", "projectId") REFERENCES "Task"("id", "userId", "projectId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkLogEntry"
  ADD CONSTRAINT "WorkLogEntry_projectId_userId_fkey"
  FOREIGN KEY ("projectId", "userId") REFERENCES "Project"("id", "ownerId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkLogEntry"
  ADD CONSTRAINT "WorkLogEntry_sessionId_taskId_userId_projectId_fkey"
  FOREIGN KEY ("sessionId", "taskId", "userId", "projectId")
  REFERENCES "TaskTime"("id", "taskId", "userId", "projectId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
