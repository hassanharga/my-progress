import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient, type TaskStatus } from '../../generated/prisma/client';
import { mutateTaskWorkspaceForOwner } from '../../src/server/tasks/mutate-task-workspace';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const OWNER_ID = '00000000-0000-4000-8000-000000000061';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000062';
const PROJECT_ID = '10000000-0000-4000-8000-000000000061';
const SECOND_PROJECT_ID = '10000000-0000-4000-8000-000000000062';
const OTHER_PROJECT_ID = '10000000-0000-4000-8000-000000000063';
const TASK_ID = '20000000-0000-4000-8000-000000000061';
const SECOND_TASK_ID = '20000000-0000-4000-8000-000000000062';
const OTHER_TASK_ID = '20000000-0000-4000-8000-000000000063';
const NOW = new Date('2026-09-22T12:00:00.000Z');

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

const query = (taskId = TASK_ID) => ({ query: '', state: null, taskId });

const createTask = async ({
  id = TASK_ID,
  projectId = PROJECT_ID,
  status = 'READY',
  userId = OWNER_ID,
}: {
  id?: string;
  projectId?: string;
  status?: TaskStatus;
  userId?: string;
} = {}) => {
  await prisma.task.create({ data: { id, projectId, status, title: `${status} task`, userId } });
  if (status === 'IN_PROGRESS') {
    await prisma.workSession.create({
      data: { projectId, source: 'TIMER', startedAt: NOW, taskId: id, userId },
    });
  }
};

beforeAll(async () => {
  schemaName = `p402_${process.pid}_${Date.now()}`;
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
      { email: 'workspace-owner@example.test', id: OWNER_ID, name: 'Workspace owner', password: 'hash', timezone: 'UTC' },
      { email: 'workspace-other@example.test', id: OTHER_OWNER_ID, name: 'Other owner', password: 'hash', timezone: 'UTC' },
    ],
  });
  await prisma.project.createMany({
    data: [
      { id: PROJECT_ID, name: 'Workspace', ownerId: OWNER_ID },
      { id: SECOND_PROJECT_ID, name: 'Second workspace', ownerId: OWNER_ID },
      { id: OTHER_PROJECT_ID, name: 'Other workspace', ownerId: OTHER_OWNER_ID },
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

describe('task workspace mutations', () => {
  it('appends one progress entry and atomically updates the next step', async () => {
    await createTask();

    const result = await mutateTaskWorkspaceForOwner({
      mutation: {
        content: '<p>Validated the transaction.</p>',
        nextStep: '<p>Review the canonical result.</p>',
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        type: 'LOG_PROGRESS',
      },
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({
      data: {
        selectedTask: {
          task: { currentNextStep: '<p>Review the canonical result.</p>', id: TASK_ID },
          workLog: [{ content: '<p>Validated the transaction.</p>', kind: 'PROGRESS' }],
        },
      },
      ok: true,
    });
    await expect(prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).resolves.toMatchObject({
      currentNextStep: '<p>Review the canonical result.</p>',
      progress: '<p>Validated the transaction.</p>',
      todo: '<p>Review the canonical result.</p>',
    });
    await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(1);
  });

  it('updates only the next step without creating a ledger entry', async () => {
    await createTask();

    const result = await mutateTaskWorkspaceForOwner({
      mutation: { nextStep: '<p>Prepare the release.</p>', projectId: PROJECT_ID, taskId: TASK_ID, type: 'UPDATE_NEXT_STEP' },
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({ ok: true, data: { selectedTask: { workLog: [] } } });
    await expect(prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).resolves.toMatchObject({
      currentNextStep: '<p>Prepare the release.</p>',
      todo: '<p>Prepare the release.</p>',
    });
    await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(0);
  });

  it('rolls back the ledger and compatibility fields when a staged write fails', async () => {
    await createTask();

    await expect(
      mutateTaskWorkspaceForOwner({
        afterMutation: async () => {
          throw new Error('Injected rollback');
        },
        mutation: {
          content: '<p>This must not commit.</p>',
          nextStep: '<p>This must not commit either.</p>',
          projectId: PROJECT_ID,
          taskId: TASK_ID,
          type: 'LOG_PROGRESS',
        },
        ownerId: OWNER_ID,
        prisma,
        query: query(),
      })
    ).rejects.toThrow('Injected rollback');
    await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(0);
    await expect(prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).resolves.toMatchObject({
      currentNextStep: null,
      progress: null,
      todo: null,
    });
  });

  it('does not disclose unowned tasks or accept a task from another owned project', async () => {
    await createTask({ id: SECOND_TASK_ID, projectId: SECOND_PROJECT_ID });
    await createTask({ id: OTHER_TASK_ID, projectId: OTHER_PROJECT_ID, userId: OTHER_OWNER_ID });

    const crossProject = await mutateTaskWorkspaceForOwner({
      mutation: { nextStep: '<p>Nope</p>', projectId: PROJECT_ID, taskId: SECOND_TASK_ID, type: 'UPDATE_NEXT_STEP' },
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });
    const unowned = await mutateTaskWorkspaceForOwner({
      mutation: { nextStep: '<p>Nope</p>', projectId: PROJECT_ID, taskId: OTHER_TASK_ID, type: 'UPDATE_NEXT_STEP' },
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(crossProject).toMatchObject({ error: { code: 'NOT_FOUND' }, ok: false });
    expect(unowned).toMatchObject({ error: { code: 'NOT_FOUND' }, ok: false });
  });

  it('rejects ledger mutations after a task reaches a terminal state', async () => {
    await createTask({ status: 'COMPLETED' });

    const result = await mutateTaskWorkspaceForOwner({
      mutation: { content: '<p>Late update</p>', projectId: PROJECT_ID, taskId: TASK_ID, type: 'LOG_PROGRESS' },
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({ error: { code: 'INVALID_TRANSITION', retryable: false }, ok: false });
    await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(0);
  });

  it('rejects every workspace write for archived projects', async () => {
    await createTask();
    await prisma.project.update({ data: { archived: true, archivedAt: NOW }, where: { id: PROJECT_ID } });

    const result = await mutateTaskWorkspaceForOwner({
      mutation: { nextStep: '<p>Blocked</p>', projectId: PROJECT_ID, taskId: TASK_ID, type: 'UPDATE_NEXT_STEP' },
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({
      canonical: {
        project: { archived: true, id: PROJECT_ID },
        selectedTask: { task: { id: TASK_ID } },
      },
      error: { code: 'CONFLICT', retryable: false },
      ok: false,
    });
  });

  it.each([
    { event: 'START' as const, expected: 'IN_PROGRESS' as const, status: 'READY' as const },
    { event: 'PAUSE' as const, expected: 'PAUSED' as const, status: 'IN_PROGRESS' as const },
    { event: 'COMPLETE' as const, expected: 'COMPLETED' as const, status: 'READY' as const },
    { event: 'CANCEL' as const, expected: 'CANCELLED' as const, status: 'READY' as const },
  ])('returns the canonical workspace after $event', async ({ event, expected, status }) => {
    await createTask({ status });

    const result = await mutateTaskWorkspaceForOwner({
      mutation: { projectId: PROJECT_ID, transition: { event, taskId: TASK_ID }, type: 'TRANSITION' },
      ownerId: OWNER_ID,
      prisma,
      query: query(),
    });

    expect(result).toMatchObject({
      data: {
        query: query(),
        selectedTask: { task: { id: TASK_ID, status: expected } },
        summary: expect.objectContaining({ runningTaskId: event === 'START' ? TASK_ID : null }),
      },
      ok: true,
    });
  });
});
