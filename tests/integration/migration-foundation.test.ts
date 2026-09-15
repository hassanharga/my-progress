import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { Client } from 'pg';

import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const LAST_HISTORICAL_MIGRATION = '20260707131817_add_projects_drop_company';

type Migration = {
  name: string;
  sql: string;
};

type LegacySeed = {
  closedTaskId: string;
  negativeSessionId: string;
  noSessionTaskId: string;
  oldOpenSessionId: string;
  progressTaskId: string;
  projectId: string;
  terminalOpenSessionId: string;
  terminalTaskId: string;
  userId: string;
  winningOpenSessionId: string;
};

const testSchemas = new Set<string>();
let schemaSequence = 0;

jest.setTimeout(60_000);

const quoteIdentifier = (value: string): string => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  return `"${value}"`;
};

const loadMigrations = async (): Promise<Migration[]> => {
  const entries = await readdir(MIGRATIONS_ROOT, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await readFile(path.join(MIGRATIONS_ROOT, name, 'migration.sql'), 'utf8'),
    }))
  );
};

const applyMigration = async (client: Client, migration: Migration): Promise<void> => {
  try {
    await client.query(migration.sql);
  } catch (error) {
    // A migration may explicitly open a transaction. Clear any aborted
    // transaction so the test can inspect the post-failure database state.
    await client.query('ROLLBACK');
    throw error;
  }
};

const applyMigrations = async (client: Client, migrations: Migration[]): Promise<void> => {
  for (const migration of migrations) {
    await applyMigration(client, migration);
  }
};

const createSchemaClient = async (): Promise<Client> => {
  schemaSequence += 1;
  const schemaName = `p102_${process.pid}_${schemaSequence}`;
  const client = new Client({ connectionString: getTestDatabaseUrl() });
  await client.connect();
  await client.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await client.query(`SET search_path TO ${quoteIdentifier(schemaName)}`);
  testSchemas.add(schemaName);
  return client;
};

const disposeSchemaClient = async (client: Client): Promise<void> => {
  const result = await client.query<{ current_schema: string }>('SELECT current_schema()');
  const schemaName = result.rows[0]?.current_schema;
  await client.query('RESET search_path');
  if (schemaName && testSchemas.has(schemaName)) {
    await client.query(`DROP SCHEMA ${quoteIdentifier(schemaName)} CASCADE`);
    testSchemas.delete(schemaName);
  }
  await client.end();
};

const seedValidLegacyData = async (client: Client): Promise<LegacySeed> => {
  const seed: LegacySeed = {
    closedTaskId: 'task-closed',
    negativeSessionId: 'session-negative',
    noSessionTaskId: 'task-no-session',
    oldOpenSessionId: 'session-open-a',
    progressTaskId: 'task-progress',
    projectId: 'project-primary',
    terminalOpenSessionId: 'session-terminal-open',
    terminalTaskId: 'task-terminal',
    userId: 'user-primary',
    winningOpenSessionId: 'session-open-z',
  };

  await client.query(`
    INSERT INTO "User" ("id", "email", "password", "name", "updatedAt")
    VALUES
      ('user-primary', 'primary@example.test', 'hash', 'Primary', '2026-01-05T08:00:00Z'),
      ('user-secondary', 'secondary@example.test', 'hash', 'Secondary', '2026-01-05T08:00:00Z');

    INSERT INTO "Project" ("id", "name", "updatedAt", "ownerId")
    VALUES
      ('project-primary', 'Primary project', '2026-01-05T08:00:00Z', 'user-primary'),
      ('project-secondary', 'Secondary project', '2026-01-05T08:00:00Z', 'user-secondary');

    UPDATE "User" SET "currentProjectId" = 'project-primary' WHERE "id" = 'user-primary';
    UPDATE "User" SET "currentProjectId" = 'project-secondary' WHERE "id" = 'user-secondary';

    INSERT INTO "Task" (
      "id", "title", "status", "progress", "todo", "createdAt", "updatedAt",
      "userId", "projectId", "totalSeconds"
    ) VALUES
      ('task-progress', 'Progress task', 'RESUMED', '<p>Legacy progress</p>', '<p>Ship next</p>',
       '2026-01-05T08:00:00Z', '2026-01-05T12:00:00Z', 'user-primary', 'project-primary', 99999),
      ('task-old-open', 'Old open task', 'IN_PROGRESS', NULL, NULL,
       '2026-01-05T08:00:00Z', '2026-01-05T11:00:00Z', 'user-primary', 'project-primary', 123),
      ('task-terminal', 'Terminal task', 'COMPLETED', NULL, NULL,
       '2026-01-05T08:00:00Z', '2026-01-05T11:30:00Z', 'user-secondary', 'project-secondary', 456),
      ('task-closed', 'Closed task', 'IN_PROGRESS', NULL, NULL,
       '2026-01-05T08:00:00Z', '2026-01-05T13:00:00Z', 'user-secondary', 'project-secondary', 789),
      ('task-no-session', 'No session task', 'IN_PROGRESS', NULL, '   ',
       '2026-01-05T08:00:00Z', '2026-01-05T13:00:00Z', 'user-secondary', 'project-secondary', 321);

    INSERT INTO "TaskTime" ("id", "from", "to", "taskId") VALUES
      ('session-open-a', '2026-01-05T09:00:00Z', NULL, 'task-old-open'),
      ('session-open-z', '2026-01-05T10:00:00Z', NULL, 'task-progress'),
      ('session-terminal-open', '2026-01-05T12:00:00Z', NULL, 'task-terminal'),
      ('session-negative', '2026-01-05T10:00:00Z', '2026-01-05T09:00:00Z', 'task-closed'),
      ('session-closed', '2026-01-05T12:00:00Z', '2026-01-05T12:30:00Z', 'task-closed');
  `);

  return seed;
};

const migrateValidLegacyDatabase = async (client: Client): Promise<LegacySeed> => {
  const migrations = await loadMigrations();
  const historical = migrations.filter(({ name }) => name <= LAST_HISTORICAL_MIGRATION);
  const foundation = migrations.filter(({ name }) => name > LAST_HISTORICAL_MIGRATION);

  await applyMigrations(client, historical);
  const seed = await seedValidLegacyData(client);
  await applyMigrations(client, foundation);

  return seed;
};

const expectConstraintViolation = async (operation: Promise<unknown>): Promise<void> => {
  await expect(operation).rejects.toMatchObject({ code: expect.stringMatching(/^23/) });
};

describe('Package 1 execution-data migrations', () => {
  it('makes the expand migration atomic for Prisma Migrate deployment', async () => {
    const migrations = await loadMigrations();
    const expandMigration = migrations.find(({ name }) => name.endsWith('_execution_data_expand'));

    expect(expandMigration).toBeDefined();
    expect(expandMigration?.sql.trim()).toMatch(/^BEGIN;/);
    expect(expandMigration?.sql.trim()).toMatch(/COMMIT;$/);
  });

  it('preserves and deterministically reconciles valid legacy execution data', async () => {
    const client = await createSchemaClient();

    try {
      const seed = await migrateValidLegacyDatabase(client);

      const enumLabels = await client.query<{ enumlabel: string }>(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = current_schema() AND t.typname = 'TaskStatus'
        ORDER BY e.enumsortorder
      `);
      expect(enumLabels.rows.map(({ enumlabel }) => enumlabel)).toEqual([
        'READY',
        'IN_PROGRESS',
        'PAUSED',
        'RESUMED',
        'COMPLETED',
        'CANCELLED',
      ]);

      const users = await client.query<{ dailyCapacityMinutes: number | null; timezone: string }>(`
        SELECT "dailyCapacityMinutes", "timezone" FROM "User" ORDER BY "id"
      `);
      expect(users.rows).toEqual([
        { dailyCapacityMinutes: null, timezone: 'UTC' },
        { dailyCapacityMinutes: null, timezone: 'UTC' },
      ]);

      const tasks = await client.query<{
        currentNextStep: string | null;
        id: string;
        status: string;
        totalSeconds: number;
      }>(`
        SELECT "id", "status"::text, "currentNextStep", "totalSeconds"
        FROM "Task"
        ORDER BY "id"
      `);
      expect(tasks.rows).toEqual([
        { currentNextStep: null, id: seed.closedTaskId, status: 'PAUSED', totalSeconds: 1800 },
        { currentNextStep: null, id: seed.noSessionTaskId, status: 'READY', totalSeconds: 0 },
        { currentNextStep: null, id: 'task-old-open', status: 'PAUSED', totalSeconds: 3600 },
        {
          currentNextStep: '<p>Ship next</p>',
          id: seed.progressTaskId,
          status: 'IN_PROGRESS',
          totalSeconds: 0,
        },
        { currentNextStep: null, id: seed.terminalTaskId, status: 'COMPLETED', totalSeconds: 0 },
      ]);

      const preservedLegacyPayload = await client.query<{ progress: string | null; todo: string | null }>(`
        SELECT "progress", "todo"
        FROM "Task"
        WHERE "id" = '${seed.progressTaskId}'
      `);
      expect(preservedLegacyPayload.rows[0]).toEqual({
        progress: '<p>Legacy progress</p>',
        todo: '<p>Ship next</p>',
      });

      const sessions = await client.query<{
        correctionReason: string | null;
        endedAt: Date | null;
        id: string;
        originalEndedAt: Date | null;
        originalStartedAt: Date | null;
        projectId: string;
        source: string;
        startedAt: Date;
        userId: string;
      }>(`
        SELECT
          "id",
          "from" AT TIME ZONE 'UTC' AS "startedAt",
          "to" AT TIME ZONE 'UTC' AS "endedAt",
          "userId",
          "projectId",
          "source"::text,
          "originalStartedAt" AT TIME ZONE 'UTC' AS "originalStartedAt",
          "originalEndedAt" AT TIME ZONE 'UTC' AS "originalEndedAt",
          "correctionReason"
        FROM "TaskTime"
        ORDER BY "id"
      `);
      expect(sessions.rows).toHaveLength(5);
      expect(sessions.rows.find(({ id }) => id === seed.winningOpenSessionId)).toMatchObject({
        endedAt: null,
        projectId: seed.projectId,
        source: 'MIGRATED',
        userId: seed.userId,
      });
      expect(sessions.rows.find(({ id }) => id === seed.oldOpenSessionId)?.endedAt).toEqual(
        new Date('2026-01-05T10:00:00.000Z')
      );
      expect(sessions.rows.find(({ id }) => id === seed.terminalOpenSessionId)?.endedAt).toEqual(
        new Date('2026-01-05T12:00:00.000Z')
      );
      expect(sessions.rows.find(({ id }) => id === seed.negativeSessionId)).toMatchObject({
        correctionReason: 'migration-repair:end-before-start',
        endedAt: new Date('2026-01-05T10:00:00.000Z'),
        originalEndedAt: new Date('2026-01-05T09:00:00.000Z'),
        originalStartedAt: new Date('2026-01-05T10:00:00.000Z'),
      });

      const workLog = await client.query<{
        content: string;
        id: string;
        kind: string;
        nextStepSnapshot: string | null;
      }>(`
        SELECT "id", "kind"::text, "content", "nextStepSnapshot"
        FROM "WorkLogEntry"
      `);
      expect(workLog.rows).toEqual([
        {
          content: '<p>Legacy progress</p>',
          id: `legacy-progress-${seed.progressTaskId}`,
          kind: 'PROGRESS',
          nextStepSnapshot: '<p>Ship next</p>',
        },
      ]);

      const preservedCounts = await client.query<{
        projects: number;
        sessions: number;
        tasks: number;
        users: number;
      }>(`
        SELECT
          (SELECT COUNT(*)::int FROM "User") AS users,
          (SELECT COUNT(*)::int FROM "Project") AS projects,
          (SELECT COUNT(*)::int FROM "Task") AS tasks,
          (SELECT COUNT(*)::int FROM "TaskTime") AS sessions
      `);
      expect(preservedCounts.rows[0]).toEqual({ projects: 2, sessions: 5, tasks: 5, users: 2 });
    } finally {
      await disposeSchemaClient(client);
    }
  });

  it('aborts the expand migration transaction when legacy ownership is inconsistent', async () => {
    const client = await createSchemaClient();

    try {
      const migrations = await loadMigrations();
      const historical = migrations.filter(({ name }) => name <= LAST_HISTORICAL_MIGRATION);
      const foundation = migrations.filter(({ name }) => name > LAST_HISTORICAL_MIGRATION);
      await applyMigrations(client, historical);

      await client.query(`
        INSERT INTO "User" ("id", "email", "password", "name", "updatedAt") VALUES
          ('user-a', 'a@example.test', 'hash', 'A', NOW()),
          ('user-b', 'b@example.test', 'hash', 'B', NOW());
        INSERT INTO "Project" ("id", "name", "updatedAt", "ownerId") VALUES
          ('project-a', 'A', NOW(), 'user-a'),
          ('project-b', 'B', NOW(), 'user-b');
        UPDATE "User" SET "currentProjectId" = 'project-b' WHERE "id" = 'user-a';
        INSERT INTO "Task" ("id", "title", "status", "createdAt", "updatedAt", "userId", "projectId")
        VALUES ('task-mismatch', 'Mismatch', 'IN_PROGRESS', NOW(), NOW(), 'user-a', 'project-b');
      `);

      await applyMigration(client, foundation[0]);
      await expect(applyMigration(client, foundation[1])).rejects.toThrow(
        /ownership preflight failed[\s\S]*task-mismatch[\s\S]*user-a/i
      );

      const expandColumns = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'User'
          AND column_name = 'timezone'
      `);
      expect(expandColumns.rows[0]?.count).toBe('0');

      const enumLabels = await client.query<{ enumlabel: string }>(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = current_schema() AND t.typname = 'TaskStatus'
        ORDER BY e.enumsortorder
      `);
      expect(enumLabels.rows.map(({ enumlabel }) => enumlabel)).toContain('READY');
    } finally {
      await disposeSchemaClient(client);
    }
  });

  it('enforces ownership, open-session, and non-negative execution-data invariants', async () => {
    const client = await createSchemaClient();

    try {
      const seed = await migrateValidLegacyDatabase(client);

      const partialIndexes = await client.query<{ indexdef: string; indexname: string }>(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname IN ('TaskTime_one_open_per_task', 'TaskTime_one_open_per_project')
        ORDER BY indexname
      `);
      expect(partialIndexes.rows.map(({ indexname }) => indexname)).toEqual([
        'TaskTime_one_open_per_project',
        'TaskTime_one_open_per_task',
      ]);
      expect(partialIndexes.rows[0]?.indexdef).toMatch(
        /UNIQUE INDEX .*TaskTime_one_open_per_project.*\("projectId"\).*WHERE \("to" IS NULL\)/
      );
      expect(partialIndexes.rows[1]?.indexdef).toMatch(
        /UNIQUE INDEX .*TaskTime_one_open_per_task.*\("taskId"\).*WHERE \("to" IS NULL\)/
      );

      const checkConstraints = await client.query<{ definition: string; name: string }>(`
        SELECT c.conname AS name, pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = current_schema()
          AND c.conname IN (
            'User_dailyCapacityMinutes_check',
            'Task_defaultPlannedMinutes_check',
            'TaskTime_interval_check',
            'DailyPlanItem_plannedMinutes_check',
            'DailyPlanItem_position_check'
          )
        ORDER BY c.conname
      `);
      expect(checkConstraints.rows).toHaveLength(5);

      await client.query(`
        INSERT INTO "Task" (
          "id", "title", "createdAt", "updatedAt", "userId", "projectId"
        ) VALUES (
          'task-default-ready', 'Default ready', NOW(), NOW(), 'user-secondary', 'project-secondary'
        )
      `);
      const defaultState = await client.query<{ status: string }>(`
        SELECT "status"::text FROM "Task" WHERE "id" = 'task-default-ready'
      `);
      expect(defaultState.rows[0]?.status).toBe('READY');

      await expectConstraintViolation(
        client.query(`
          INSERT INTO "Task" (
            "id", "title", "status", "createdAt", "updatedAt", "userId", "projectId"
          ) VALUES (
            'task-cross-owner', 'Cross owner', 'READY', NOW(), NOW(), 'user-secondary', 'project-primary'
          )
        `)
      );

      await expectConstraintViolation(
        client.query(`
          INSERT INTO "TaskTime" (
            "id", "from", "to", "taskId", "userId", "projectId", "source", "createdAt", "updatedAt"
          ) VALUES (
            'session-cross-owner', NOW(), NOW(), '${seed.closedTaskId}', '${seed.userId}',
            'project-secondary', 'TIMER', NOW(), NOW()
          )
        `)
      );

      await expectConstraintViolation(
        client.query(`
          UPDATE "User"
          SET "currentProjectId" = 'project-secondary'
          WHERE "id" = '${seed.userId}'
        `)
      );

      await expectConstraintViolation(
        client.query(`
          INSERT INTO "TaskTime" (
            "id", "from", "taskId", "userId", "projectId", "source", "createdAt", "updatedAt"
          ) VALUES (
            'session-duplicate', NOW(), '${seed.progressTaskId}', '${seed.userId}', '${seed.projectId}',
            'TIMER', NOW(), NOW()
          )
        `)
      );

      await expectConstraintViolation(
        client.query(`
          INSERT INTO "TaskTime" (
            "id", "from", "to", "taskId", "userId", "projectId", "source", "createdAt", "updatedAt"
          ) VALUES (
            'session-negative-new', '2026-01-05T11:00:00Z', '2026-01-05T10:00:00Z',
            '${seed.closedTaskId}', 'user-secondary', 'project-secondary', 'TIMER', NOW(), NOW()
          )
        `)
      );

      await expectConstraintViolation(
        client.query(`UPDATE "User" SET "dailyCapacityMinutes" = -1 WHERE "id" = '${seed.userId}'`)
      );

      await expectConstraintViolation(
        client.query(`UPDATE "Task" SET "defaultPlannedMinutes" = -1 WHERE "id" = '${seed.progressTaskId}'`)
      );

      await expectConstraintViolation(
        client.query(`
          INSERT INTO "DailyPlanItem" (
            "id", "userId", "projectId", "taskId", "planDate", "plannedMinutes", "position",
            "createdAt", "updatedAt"
          ) VALUES (
            'plan-negative-minutes', '${seed.userId}', '${seed.projectId}', '${seed.progressTaskId}',
            '2026-01-05', -1, 0, NOW(), NOW()
          )
        `)
      );

      await expectConstraintViolation(
        client.query(`
          INSERT INTO "DailyPlanItem" (
            "id", "userId", "projectId", "taskId", "planDate", "plannedMinutes", "position",
            "createdAt", "updatedAt"
          ) VALUES (
            'plan-negative-position', '${seed.userId}', '${seed.projectId}', '${seed.progressTaskId}',
            '2026-01-06', NULL, -1, NOW(), NOW()
          )
        `)
      );

      await expectConstraintViolation(
        client.query(`
          INSERT INTO "DailyPlanItem" (
            "id", "userId", "projectId", "taskId", "planDate", "position", "createdAt", "updatedAt"
          ) VALUES (
            'plan-cross-owner', 'user-secondary', '${seed.projectId}', '${seed.progressTaskId}',
            '2026-01-05', 0, NOW(), NOW()
          )
        `)
      );

      await expectConstraintViolation(
        client.query(`
          INSERT INTO "WorkLogEntry" (
            "id", "userId", "projectId", "taskId", "kind", "content", "createdAt", "updatedAt"
          ) VALUES (
            'log-cross-owner', 'user-secondary', '${seed.projectId}', '${seed.progressTaskId}',
            'NOTE', 'Not allowed', NOW(), NOW()
          )
        `)
      );
    } finally {
      await disposeSchemaClient(client);
    }
  });
});
