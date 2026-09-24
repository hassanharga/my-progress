import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import { mutateProjectWorkspaceLifecycleForOwner } from '../../src/server/projects/mutate-project-workspace';
import { mutateTaskWorkspaceForOwner } from '../../src/server/tasks/mutate-task-workspace';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const OWNER_ID = '00000000-0000-4000-8000-000000000071';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000072';
const PROJECT_ID = '10000000-0000-4000-8000-000000000071';
const OLDER_PROJECT_ID = '10000000-0000-4000-8000-000000000072';
const NEWER_PROJECT_ID = '10000000-0000-4000-8000-000000000073';
const OTHER_PROJECT_ID = '10000000-0000-4000-8000-000000000074';
const TASK_ID = '20000000-0000-4000-8000-000000000071';
const NOW = new Date('2026-09-22T14:00:00.000Z');
const QUERY = { query: '', state: null, taskId: TASK_ID } as const;

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

beforeAll(async () => {
  schemaName = `p404_${process.pid}_${Date.now()}`;
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
      { email: 'lifecycle-owner@example.test', id: OWNER_ID, name: 'Lifecycle owner', password: 'hash' },
      { email: 'lifecycle-other@example.test', id: OTHER_OWNER_ID, name: 'Other owner', password: 'hash' },
    ],
  });
  await prisma.project.createMany({
    data: [
      {
        createdAt: new Date('2026-09-20T00:00:00.000Z'),
        id: PROJECT_ID,
        name: 'Lifecycle project',
        ownerId: OWNER_ID,
      },
      {
        createdAt: new Date('2026-09-18T00:00:00.000Z'),
        id: OLDER_PROJECT_ID,
        name: 'Older fallback',
        ownerId: OWNER_ID,
      },
      {
        createdAt: new Date('2026-09-21T00:00:00.000Z'),
        id: NEWER_PROJECT_ID,
        name: 'Newer fallback',
        ownerId: OWNER_ID,
      },
      { id: OTHER_PROJECT_ID, name: 'Other project', ownerId: OTHER_OWNER_ID },
    ],
  });
  await prisma.user.update({ data: { currentProjectId: PROJECT_ID }, where: { id: OWNER_ID } });
  await prisma.task.create({
    data: {
      currentNextStep: 'Keep the next step',
      id: TASK_ID,
      projectId: PROJECT_ID,
      status: 'PAUSED',
      title: 'Preserved task',
      userId: OWNER_ID,
    },
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

const mutateLifecycle = (type: 'ARCHIVE' | 'RESTORE', projectId = PROJECT_ID) =>
  mutateProjectWorkspaceLifecycleForOwner({
    clock: () => NOW,
    mutation: { projectId, type },
    ownerId: OWNER_ID,
    prisma,
    query: QUERY,
  });

describe('project workspace lifecycle', () => {
  it('refuses archive while a project session is open and returns canonical current state', async () => {
    await prisma.workSession.create({
      data: { projectId: PROJECT_ID, startedAt: NOW, taskId: TASK_ID, userId: OWNER_ID },
    });

    await expect(mutateLifecycle('ARCHIVE')).resolves.toMatchObject({
      canonical: {
        project: { archived: false, id: PROJECT_ID },
        selectedTask: { openSession: { endedAt: null } },
        summary: { runningTaskId: TASK_ID },
      },
      error: { code: 'CONFLICT', retryable: false },
      ok: false,
    });
    await expect(prisma.project.findUniqueOrThrow({ where: { id: PROJECT_ID } })).resolves.toMatchObject({
      archived: false,
      archivedAt: null,
    });
  });

  it('does not reveal whether a missing or unowned project exists', async () => {
    const missing = await mutateLifecycle('ARCHIVE', '10000000-0000-4000-8000-000000000075');
    const unowned = await mutateLifecycle('ARCHIVE', OTHER_PROJECT_ID);

    expect(missing).toEqual(unowned);
    expect(missing).toMatchObject({ error: { code: 'NOT_FOUND', retryable: false }, ok: false });
  });

  it('archives idempotently, returns the archived workspace, and selects the newest active fallback', async () => {
    const first = await mutateLifecycle('ARCHIVE');
    const second = await mutateLifecycle('ARCHIVE');

    expect(first).toMatchObject({
      data: { project: { archived: true, archivedAt: NOW, id: PROJECT_ID }, selectedTask: { task: { id: TASK_ID } } },
      ok: true,
    });
    expect(second).toMatchObject({
      data: { project: { archived: true, archivedAt: NOW, id: PROJECT_ID } },
      ok: true,
    });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: OWNER_ID } })).resolves.toMatchObject({
      currentProjectId: NEWER_PROJECT_ID,
    });
  });

  it('does not replace the active-project pointer when archiving another project', async () => {
    await prisma.user.update({ data: { currentProjectId: NEWER_PROJECT_ID }, where: { id: OWNER_ID } });

    await expect(mutateLifecycle('ARCHIVE')).resolves.toMatchObject({
      data: { project: { archived: true, id: PROJECT_ID } },
      ok: true,
    });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: OWNER_ID } })).resolves.toMatchObject({
      currentProjectId: NEWER_PROJECT_ID,
    });
  });

  it('preserves task, session, work-log, and Today history while archiving', async () => {
    const endedAt = new Date('2026-09-22T13:00:00.000Z');
    const session = await prisma.workSession.create({
      data: {
        endedAt,
        projectId: PROJECT_ID,
        startedAt: new Date('2026-09-22T12:00:00.000Z'),
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });
    await prisma.workLogEntry.create({
      data: {
        content: 'Preserve me',
        projectId: PROJECT_ID,
        sessionId: session.id,
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });
    await prisma.dailyPlanItem.create({
      data: {
        planDate: new Date('2026-09-22T00:00:00.000Z'),
        position: 1,
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });

    await expect(mutateLifecycle('ARCHIVE')).resolves.toMatchObject({
      data: { project: { archived: true } },
      ok: true,
    });
    await expect(prisma.task.count({ where: { id: TASK_ID } })).resolves.toBe(1);
    await expect(prisma.workSession.count({ where: { taskId: TASK_ID } })).resolves.toBe(1);
    await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(1);
    await expect(prisma.dailyPlanItem.count({ where: { taskId: TASK_ID } })).resolves.toBe(1);
  });

  it('keeps archived projects read-only and re-enables writes after restore', async () => {
    await mutateLifecycle('ARCHIVE');

    await expect(
      mutateTaskWorkspaceForOwner({
        mutation: { nextStep: 'Blocked edit', projectId: PROJECT_ID, taskId: TASK_ID, type: 'UPDATE_NEXT_STEP' },
        ownerId: OWNER_ID,
        prisma,
        query: QUERY,
      })
    ).resolves.toMatchObject({ error: { code: 'CONFLICT' }, ok: false });

    await expect(mutateLifecycle('RESTORE')).resolves.toMatchObject({
      data: { project: { archived: false, archivedAt: null, id: PROJECT_ID } },
      ok: true,
    });
    await expect(
      mutateTaskWorkspaceForOwner({
        mutation: { nextStep: 'Allowed edit', projectId: PROJECT_ID, taskId: TASK_ID, type: 'UPDATE_NEXT_STEP' },
        ownerId: OWNER_ID,
        prisma,
        query: QUERY,
      })
    ).resolves.toMatchObject({ data: { selectedTask: { task: { currentNextStep: 'Allowed edit' } } }, ok: true });
  });

  it('restores idempotently without changing active project, tasks, sessions, logs, or Today history', async () => {
    await mutateLifecycle('ARCHIVE');
    const before = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: OWNER_ID } }),
      prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } }),
      prisma.workSession.count({ where: { taskId: TASK_ID } }),
      prisma.workLogEntry.count({ where: { taskId: TASK_ID } }),
      prisma.dailyPlanItem.count({ where: { taskId: TASK_ID } }),
    ]);

    const first = await mutateLifecycle('RESTORE');
    const second = await mutateLifecycle('RESTORE');
    const after = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: OWNER_ID } }),
      prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } }),
      prisma.workSession.count({ where: { taskId: TASK_ID } }),
      prisma.workLogEntry.count({ where: { taskId: TASK_ID } }),
      prisma.dailyPlanItem.count({ where: { taskId: TASK_ID } }),
    ]);

    expect(first).toMatchObject({ data: { project: { archived: false, archivedAt: null } }, ok: true });
    expect(second).toMatchObject({ data: { project: { archived: false, archivedAt: null } }, ok: true });
    expect(after[0].currentProjectId).toBe(before[0].currentProjectId);
    expect(after.slice(1)).toEqual(before.slice(1));
  });
});
