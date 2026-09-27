import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import { archiveProjectForOwner } from '../../src/actions/project';
import {
  createTask,
  createTaskForOwner,
  getTaskByIdForOwner,
  updateTask,
  updateTaskDetailsForOwner,
  updateTaskForOwner,
} from '../../src/actions/task';
import { createTaskInputSchema, taskTransitionSchema } from '../../src/schema/task';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const OWNER_ID = '00000000-0000-4000-8000-000000000011';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000012';
const PROJECT_ID = '10000000-0000-4000-8000-000000000011';
const OTHER_PROJECT_ID = '10000000-0000-4000-8000-000000000012';
const TASK_ID = '20000000-0000-4000-8000-000000000011';
const OTHER_TASK_ID = '20000000-0000-4000-8000-000000000012';
const NOW = new Date('2026-09-13T12:00:00.000Z');

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

const resetData = async (): Promise<void> => {
  await prisma.workLogEntry.deleteMany();
  await prisma.dailyPlanItem.deleteMany();
  await prisma.workSession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.updateMany({ data: { currentProjectId: null } });
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
};

const seedOwners = async (): Promise<void> => {
  await prisma.user.createMany({
    data: [
      { email: 'action-owner@example.test', id: OWNER_ID, name: 'Action owner', password: 'hash' },
      { email: 'action-other@example.test', id: OTHER_OWNER_ID, name: 'Other owner', password: 'hash' },
    ],
  });
  await prisma.project.createMany({
    data: [
      { id: PROJECT_ID, name: 'Owned project', ownerId: OWNER_ID },
      { id: OTHER_PROJECT_ID, name: 'Other project', ownerId: OTHER_OWNER_ID },
    ],
  });
  await prisma.user.update({ data: { currentProjectId: PROJECT_ID }, where: { id: OWNER_ID } });
  await prisma.user.update({ data: { currentProjectId: OTHER_PROJECT_ID }, where: { id: OTHER_OWNER_ID } });
};

beforeAll(async () => {
  schemaName = `p104_${process.pid}_${Date.now()}`;
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
  await resetData();
  await seedOwners();
});

afterAll(async () => {
  await prisma?.$disconnect();
  if (admin) {
    await admin.query('RESET search_path');
    await admin.query(`DROP SCHEMA ${quoteIdentifier(schemaName)} CASCADE`);
    await admin.end();
  }
});

describe('canonical task action inputs', () => {
  it('accepts events and rejects status aliases or blank task titles in the schemas', () => {
    expect(taskTransitionSchema.safeParse({ event: 'START', taskId: TASK_ID }).success).toBe(true);
    expect(taskTransitionSchema.safeParse({ status: 'RESUMED', taskId: TASK_ID }).success).toBe(false);
    expect(createTaskInputSchema.safeParse({ startNow: true, title: '  ' }).success).toBe(false);
  });

  it('returns safe-action validation errors before authentication or mutation', async () => {
    const invalidCreate = await createTask({ startNow: true, title: '  ' });
    const invalidTransition = await updateTask({ status: 'RESUMED', taskId: TASK_ID } as never);

    expect(invalidCreate?.validationErrors).toBeDefined();
    expect(invalidTransition?.validationErrors).toBeDefined();
    await expect(prisma.task.count()).resolves.toBe(0);
  });
});

describe('owner-scoped task action coordinators', () => {
  it('creates and starts through one boundary, handing off the existing project session', async () => {
    await prisma.task.create({
      data: { id: TASK_ID, projectId: PROJECT_ID, status: 'IN_PROGRESS', title: 'Previous task', userId: OWNER_ID },
    });
    await prisma.workSession.create({
      data: {
        id: '30000000-0000-4000-8000-000000000011',
        projectId: PROJECT_ID,
        startedAt: new Date('2026-09-13T11:00:00.000Z'),
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });

    const result = await createTaskForOwner({
      clock: () => NOW,
      input: { progress: '<p>Initial note</p>', startNow: true, title: 'New task' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        replacedTask: { id: TASK_ID, status: 'PAUSED', totalSeconds: 3600 },
        task: { status: 'IN_PROGRESS' },
      },
      ok: true,
    });
    if (!result.ok) throw new Error('Expected task creation to succeed');
    await expect(prisma.workSession.count({ where: { endedAt: null, projectId: PROJECT_ID } })).resolves.toBe(1);
    await expect(prisma.task.findUniqueOrThrow({ where: { id: result.data.task.id } })).resolves.toMatchObject({
      progress: '<p>Initial note</p>',
      status: 'IN_PROGRESS',
    });
    await expect(
      prisma.workLogEntry.findFirstOrThrow({ where: { taskId: result.data.task.id } })
    ).resolves.toMatchObject({
      content: '<p>Initial note</p>',
      kind: 'PROGRESS',
    });
  });

  it('creates a READY task without opening a session when startNow is false', async () => {
    const result = await createTaskForOwner({
      clock: () => NOW,
      input: { description: 'Define the handoff', startNow: false, title: 'Backlog task' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({ data: { session: null, task: { status: 'READY' } }, ok: true });
    if (!result.ok) throw new Error('Expected task creation to succeed');
    await expect(prisma.workSession.count({ where: { projectId: PROJECT_ID } })).resolves.toBe(0);
    await expect(prisma.task.findFirstOrThrow({ where: { title: 'Backlog task' } })).resolves.toMatchObject({
      description: 'Define the handoff',
      progress: null,
    });
    await expect(prisma.workLogEntry.count({ where: { taskId: result.data.task.id } })).resolves.toBe(0);
  });

  it('does not leave a created task behind when the active project is archived', async () => {
    await prisma.project.update({ data: { archived: true, archivedAt: NOW }, where: { id: PROJECT_ID } });

    const result = await createTaskForOwner({
      clock: () => NOW,
      input: { startNow: true, title: 'Must roll back' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({ error: { code: 'CONFLICT' }, ok: false });
    await expect(prisma.task.count({ where: { projectId: PROJECT_ID } })).resolves.toBe(0);
  });

  it('returns the canonical transition result and dual-writes ledger and legacy fields', async () => {
    await prisma.task.create({
      data: { id: TASK_ID, projectId: PROJECT_ID, status: 'IN_PROGRESS', title: 'Finish me', userId: OWNER_ID },
    });
    await prisma.workSession.create({
      data: {
        id: '30000000-0000-4000-8000-000000000011',
        projectId: PROJECT_ID,
        startedAt: new Date('2026-09-13T11:00:00.000Z'),
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });

    const result = await updateTaskForOwner({
      clock: () => NOW,
      input: {
        completionSummary: '<p>Completed</p>',
        event: 'COMPLETE',
        nextStep: '<p>Follow up</p>',
        progressNote: '<p>Shipped</p>',
        taskId: TASK_ID,
      },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: { task: { currentNextStep: '<p>Follow up</p>', status: 'COMPLETED', totalSeconds: 3600 } },
      ok: true,
    });
    await expect(prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).resolves.toMatchObject({
      currentNextStep: '<p>Follow up</p>',
      progress: '<p>Shipped</p>',
      todo: '<p>Follow up</p>',
    });
    await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(2);
  });

  it('returns the same typed not-found result for a foreign owner', async () => {
    await prisma.task.create({
      data: { id: OTHER_TASK_ID, projectId: OTHER_PROJECT_ID, title: 'Private task', userId: OTHER_OWNER_ID },
    });

    await expect(
      updateTaskForOwner({
        clock: () => NOW,
        input: { event: 'START', taskId: OTHER_TASK_ID },
        ownerId: OWNER_ID,
        prisma,
      })
    ).resolves.toEqual({
      error: { code: 'NOT_FOUND', message: 'Task not found', retryable: false },
      ok: false,
    });
  });

  it('reads authoritative ledger fields first and falls back to legacy fields', async () => {
    await prisma.task.createMany({
      data: [
        {
          currentNextStep: '<p>Ledger next</p>',
          id: TASK_ID,
          progress: '<p>Legacy progress</p>',
          projectId: PROJECT_ID,
          status: 'PAUSED',
          title: 'Migrated task',
          todo: '<p>Legacy todo</p>',
          userId: OWNER_ID,
        },
        {
          id: OTHER_TASK_ID,
          progress: '<p>Fallback progress</p>',
          projectId: PROJECT_ID,
          status: 'READY',
          title: 'Legacy task',
          todo: '<p>Fallback todo</p>',
          userId: OWNER_ID,
        },
      ],
    });
    await prisma.workLogEntry.create({
      data: {
        content: '<p>Ledger progress</p>',
        kind: 'PROGRESS',
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });

    await expect(getTaskByIdForOwner({ ownerId: OWNER_ID, prisma, taskId: TASK_ID })).resolves.toMatchObject({
      progress: '<p>Ledger progress</p>',
      todo: '<p>Ledger next</p>',
    });
    await expect(getTaskByIdForOwner({ ownerId: OWNER_ID, prisma, taskId: OTHER_TASK_ID })).resolves.toMatchObject({
      progress: '<p>Fallback progress</p>',
      todo: '<p>Fallback todo</p>',
    });
  });

  it('edits task details through an owner-scoped ledger and legacy dual-write', async () => {
    await prisma.task.create({
      data: { id: TASK_ID, projectId: PROJECT_ID, title: 'Before', userId: OWNER_ID },
    });

    const result = await updateTaskDetailsForOwner({
      input: {
        description: 'Updated scope',
        id: TASK_ID,
        progress: '<p>Edited progress</p>',
        title: 'After',
        todo: '<p>Edited next step</p>',
      },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        description: 'Updated scope',
        progress: '<p>Edited progress</p>',
        title: 'After',
        todo: '<p>Edited next step</p>',
      },
      ok: true,
    });
    await expect(prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).resolves.toMatchObject({
      description: 'Updated scope',
      currentNextStep: '<p>Edited next step</p>',
      progress: '<p>Edited progress</p>',
      todo: '<p>Edited next step</p>',
    });
    await expect(prisma.workLogEntry.findFirstOrThrow({ where: { taskId: TASK_ID } })).resolves.toMatchObject({
      content: '<p>Edited progress</p>',
      kind: 'PROGRESS',
      nextStepSnapshot: '<p>Edited next step</p>',
    });
  });

  it('edits a legacy task description without adding a progress entry', async () => {
    await prisma.task.create({
      data: { id: TASK_ID, projectId: PROJECT_ID, title: 'Before', userId: OWNER_ID },
    });

    const result = await updateTaskDetailsForOwner({
      input: { description: 'Updated scope', id: TASK_ID },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({ data: { description: 'Updated scope' }, ok: true });
    await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(0);
  });
});

describe('project archive action coordinator', () => {
  it('uses the owned project open session rather than task status aliases', async () => {
    await prisma.task.create({
      data: { id: TASK_ID, projectId: PROJECT_ID, status: 'READY', title: 'Stale state', userId: OWNER_ID },
    });
    await prisma.workSession.create({
      data: {
        id: '30000000-0000-4000-8000-000000000011',
        projectId: PROJECT_ID,
        startedAt: NOW,
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });

    await expect(
      archiveProjectForOwner({ clock: () => NOW, ownerId: OWNER_ID, prisma, projectId: PROJECT_ID })
    ).resolves.toMatchObject({ error: { code: 'CONFLICT' }, ok: false });
    await expect(prisma.project.findUniqueOrThrow({ where: { id: PROJECT_ID } })).resolves.toMatchObject({
      archived: false,
    });
  });
});
