import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import { correctWorkSessionForOwner } from '../../src/server/tasks/correct-work-session';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const OWNER_ID = '00000000-0000-4000-8000-000000000301';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000302';
const PROJECT_ID = '10000000-0000-4000-8000-000000000301';
const SECOND_PROJECT_ID = '10000000-0000-4000-8000-000000000302';
const OTHER_PROJECT_ID = '10000000-0000-4000-8000-000000000303';
const TASK_ID = '20000000-0000-4000-8000-000000000301';
const SECOND_TASK_ID = '20000000-0000-4000-8000-000000000302';
const CROSS_PROJECT_TASK_ID = '20000000-0000-4000-8000-000000000303';
const OTHER_TASK_ID = '20000000-0000-4000-8000-000000000304';
const SESSION_ID = '30000000-0000-4000-8000-000000000301';
const SECOND_SESSION_ID = '30000000-0000-4000-8000-000000000302';
const CROSS_PROJECT_SESSION_ID = '30000000-0000-4000-8000-000000000303';
const OTHER_SESSION_ID = '30000000-0000-4000-8000-000000000304';
const CORRECTED_AT = new Date('2026-09-22T12:00:00.000Z');

let admin: Client;
let prisma: PrismaClient;
let schemaName: string;

jest.setTimeout(60_000);

const quoteIdentifier = (value: string): string => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
};

const migrateSchema = async (): Promise<void> => {
  const entries = await readdir(MIGRATIONS_ROOT, { withFileTypes: true });
  for (const migrationName of entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    await admin.query(await readFile(path.join(MIGRATIONS_ROOT, migrationName, 'migration.sql'), 'utf8'));
  }
};

const correction = (
  overrides: Partial<{
    endedAt: string;
    projectId: string;
    reason: string;
    sessionId: string;
    startedAt: string;
    taskId: string;
  }> = {}
) => ({
  endedAt: '2026-09-22T10:45:00.000Z',
  projectId: PROJECT_ID,
  reason: 'Calendar correction',
  sessionId: SESSION_ID,
  startedAt: '2026-09-22T10:15:00.000Z',
  taskId: TASK_ID,
  ...overrides,
});

const query = (taskId = TASK_ID) => ({ query: '', state: null, taskId });

const createClosedSession = async ({
  endedAt = new Date('2026-09-22T11:00:00.000Z'),
  id = SESSION_ID,
  projectId = PROJECT_ID,
  startedAt = new Date('2026-09-22T10:00:00.000Z'),
  taskId = TASK_ID,
  userId = OWNER_ID,
}: Partial<{
  endedAt: Date;
  id: string;
  projectId: string;
  startedAt: Date;
  taskId: string;
  userId: string;
}> = {}) => prisma.workSession.create({ data: { endedAt, id, projectId, startedAt, taskId, userId } });

beforeAll(async () => {
  schemaName = `p403_${process.pid}_${Date.now()}`;
  admin = new Client({ connectionString: getTestDatabaseUrl() });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await admin.query(`SET search_path TO ${quoteIdentifier(schemaName)}`);
  await migrateSchema();

  const connectionUrl = new URL(getTestDatabaseUrl());
  connectionUrl.searchParams.set('options', `-c search_path=${schemaName}`);
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: connectionUrl.toString() }, { schema: schemaName }),
  });
});

beforeEach(async () => {
  await prisma.workLogEntry.deleteMany();
  await prisma.dailyPlanItem.deleteMany();
  await prisma.workSession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.updateMany({ data: { currentProjectId: null } });
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { email: 'correction-owner@example.test', id: OWNER_ID, name: 'Owner', password: 'hash', timezone: 'UTC' },
      { email: 'correction-other@example.test', id: OTHER_OWNER_ID, name: 'Other', password: 'hash', timezone: 'UTC' },
    ],
  });
  await prisma.project.createMany({
    data: [
      { id: PROJECT_ID, name: 'Project', ownerId: OWNER_ID },
      { id: SECOND_PROJECT_ID, name: 'Second project', ownerId: OWNER_ID },
      { id: OTHER_PROJECT_ID, name: 'Other project', ownerId: OTHER_OWNER_ID },
    ],
  });
  await prisma.task.createMany({
    data: [
      { id: TASK_ID, projectId: PROJECT_ID, title: 'Task', userId: OWNER_ID },
      { id: SECOND_TASK_ID, projectId: PROJECT_ID, title: 'Second task', userId: OWNER_ID },
      { id: CROSS_PROJECT_TASK_ID, projectId: SECOND_PROJECT_ID, title: 'Cross-project task', userId: OWNER_ID },
      { id: OTHER_TASK_ID, projectId: OTHER_PROJECT_ID, title: 'Other task', userId: OTHER_OWNER_ID },
    ],
  });
});

afterAll(async () => {
  await prisma?.$disconnect();
  if (admin) {
    await admin.query('RESET search_path');
    await admin.query(`DROP SCHEMA ${quoteIdentifier(schemaName)} CASCADE`);
    await admin.end();
  }
});

describe('closed-session correction', () => {
  it('does not disclose an unowned or cross-project session', async () => {
    await createClosedSession({
      id: CROSS_PROJECT_SESSION_ID,
      projectId: SECOND_PROJECT_ID,
      taskId: CROSS_PROJECT_TASK_ID,
    });
    await createClosedSession({
      id: OTHER_SESSION_ID,
      projectId: OTHER_PROJECT_ID,
      taskId: OTHER_TASK_ID,
      userId: OTHER_OWNER_ID,
    });

    const crossProject = await correctWorkSessionForOwner({
      correction: correction({ sessionId: CROSS_PROJECT_SESSION_ID }),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });
    const unowned = await correctWorkSessionForOwner({
      correction: correction({ sessionId: OTHER_SESSION_ID }),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(crossProject).toMatchObject({ error: { code: 'NOT_FOUND' }, ok: false });
    expect(unowned).toMatchObject({ error: { code: 'NOT_FOUND' }, ok: false });
  });

  it('rejects an open session and leaves it unchanged', async () => {
    await prisma.workSession.create({
      data: {
        id: SESSION_ID,
        projectId: PROJECT_ID,
        startedAt: new Date('2026-09-22T10:00:00.000Z'),
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });

    const result = await correctWorkSessionForOwner({
      correction: correction(),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({
      canonical: { selectedTask: { openSession: { id: SESSION_ID } } },
      error: { code: 'CONFLICT' },
      ok: false,
    });
    await expect(prisma.workSession.findUniqueOrThrow({ where: { id: SESSION_ID } })).resolves.toMatchObject({
      endedAt: null,
    });
  });

  it('rejects corrections for an archived project with canonical state', async () => {
    await createClosedSession();
    await prisma.project.update({
      data: { archived: true, archivedAt: CORRECTED_AT },
      where: { id: PROJECT_ID },
    });

    const result = await correctWorkSessionForOwner({
      correction: correction(),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({
      canonical: { project: { archived: true }, selectedTask: { task: { id: TASK_ID } } },
      error: { code: 'CONFLICT' },
      ok: false,
    });
  });

  it('preserves first originals across repeated corrections and returns the selected canonical task', async () => {
    await createClosedSession();

    const first = await correctWorkSessionForOwner({
      clock: () => CORRECTED_AT,
      correction: correction(),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });
    const second = await correctWorkSessionForOwner({
      clock: () => new Date('2026-09-22T13:00:00.000Z'),
      correction: correction({
        endedAt: '2026-09-22T10:50:00.000Z',
        reason: 'Second correction',
        startedAt: '2026-09-22T10:20:00.000Z',
      }),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(first).toMatchObject({ data: { selectedTask: { task: { id: TASK_ID, totalSeconds: 1_800 } } }, ok: true });
    expect(second).toMatchObject({
      data: {
        selectedTask: {
          sessions: [{ id: SESSION_ID, correctionReason: 'Second correction', source: 'MANUAL_CORRECTION' }],
        },
      },
      ok: true,
    });
    await expect(prisma.workSession.findUniqueOrThrow({ where: { id: SESSION_ID } })).resolves.toMatchObject({
      correctedAt: new Date('2026-09-22T13:00:00.000Z'),
      originalEndedAt: new Date('2026-09-22T11:00:00.000Z'),
      originalStartedAt: new Date('2026-09-22T10:00:00.000Z'),
    });
  });

  it('rejects overlap with another session on the same task', async () => {
    await createClosedSession();
    await createClosedSession({
      id: SECOND_SESSION_ID,
      startedAt: new Date('2026-09-22T12:00:00.000Z'),
      endedAt: new Date('2026-09-22T13:00:00.000Z'),
    });

    const result = await correctWorkSessionForOwner({
      correction: correction({ endedAt: '2026-09-22T12:30:00.000Z', startedAt: '2026-09-22T11:30:00.000Z' }),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({ error: { code: 'CONFLICT' }, ok: false });
  });

  it('rejects overlap with an open session on the same task', async () => {
    await createClosedSession();
    await prisma.workSession.create({
      data: {
        id: SECOND_SESSION_ID,
        projectId: PROJECT_ID,
        startedAt: new Date('2026-09-22T12:00:00.000Z'),
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });

    const result = await correctWorkSessionForOwner({
      correction: correction({ endedAt: '2026-09-22T12:30:00.000Z', startedAt: '2026-09-22T11:30:00.000Z' }),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({ error: { code: 'CONFLICT' }, ok: false });
    await expect(prisma.workSession.findUniqueOrThrow({ where: { id: SESSION_ID } })).resolves.toMatchObject({
      endedAt: new Date('2026-09-22T11:00:00.000Z'),
      startedAt: new Date('2026-09-22T10:00:00.000Z'),
    });
  });

  it('permits overlap with a session in another project', async () => {
    await createClosedSession();
    await createClosedSession({
      id: CROSS_PROJECT_SESSION_ID,
      projectId: SECOND_PROJECT_ID,
      taskId: CROSS_PROJECT_TASK_ID,
    });

    const result = await correctWorkSessionForOwner({
      correction: correction(),
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({ ok: true });
  });

  it('rolls back timestamps and cached totals after a staged failure', async () => {
    await createClosedSession();

    await expect(
      correctWorkSessionForOwner({
        afterCorrection: async () => {
          throw new Error('Injected rollback');
        },
        correction: correction(),
        ownerId: OWNER_ID,
        prisma,
        query: query(),
      })
    ).rejects.toThrow('Injected rollback');
    await expect(prisma.workSession.findUniqueOrThrow({ where: { id: SESSION_ID } })).resolves.toMatchObject({
      correctedAt: null,
      endedAt: new Date('2026-09-22T11:00:00.000Z'),
      startedAt: new Date('2026-09-22T10:00:00.000Z'),
    });
    await expect(prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).resolves.toMatchObject({ totalSeconds: 0 });
  });

  it('recomputes cached duration from every authoritative closed session', async () => {
    await createClosedSession();
    await createClosedSession({
      id: SECOND_SESSION_ID,
      startedAt: new Date('2026-09-22T12:00:00.000Z'),
      endedAt: new Date('2026-09-22T12:20:00.000Z'),
    });
    await prisma.task.update({ data: { totalSeconds: 999_999 }, where: { id: TASK_ID } });

    await correctWorkSessionForOwner({ correction: correction(), ownerId: OWNER_ID, prisma, query: query() });

    await expect(prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).resolves.toMatchObject({
      totalSeconds: 3_000,
    });
  });

  it('serializes competing corrections so only a non-overlapping result commits', async () => {
    await createClosedSession({ endedAt: new Date('2026-09-22T10:30:00.000Z') });
    await createClosedSession({
      id: SECOND_SESSION_ID,
      startedAt: new Date('2026-09-22T11:30:00.000Z'),
      endedAt: new Date('2026-09-22T12:00:00.000Z'),
    });

    const results = await Promise.all([
      correctWorkSessionForOwner({
        correction: correction({ endedAt: '2026-09-22T11:15:00.000Z' }),
        ownerId: OWNER_ID,
        prisma,
        query: query(),
      }),
      correctWorkSessionForOwner({
        correction: correction({
          sessionId: SECOND_SESSION_ID,
          startedAt: '2026-09-22T10:45:00.000Z',
          endedAt: '2026-09-22T12:00:00.000Z',
        }),
        ownerId: OWNER_ID,
        prisma,
        query: query(),
      }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
  });
});
