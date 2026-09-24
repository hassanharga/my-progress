import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import { readProjectWorkspaceForOwner } from '../../src/server/projects/read-project-workspace';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const OWNER_ID = '00000000-0000-4000-8000-000000000051';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000052';
const PROJECT_ID = '10000000-0000-4000-8000-000000000051';
const OTHER_PROJECT_ID = '10000000-0000-4000-8000-000000000052';
const TASK_ID = '20000000-0000-4000-8000-000000000051';
const OTHER_TASK_ID = '20000000-0000-4000-8000-000000000052';
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

beforeAll(async () => {
  schemaName = `p401_${process.pid}_${Date.now()}`;
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
      { archived: true, archivedAt: NOW, id: PROJECT_ID, name: 'Archived workspace', ownerId: OWNER_ID },
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

describe('project workspace read model', () => {
  it('returns the same not-found result for an unowned project, missing project, and cross-project selection', async () => {
    await prisma.task.createMany({
      data: [
        { id: TASK_ID, projectId: PROJECT_ID, title: 'Owned task', userId: OWNER_ID },
        { id: OTHER_TASK_ID, projectId: OTHER_PROJECT_ID, title: 'Other task', userId: OTHER_OWNER_ID },
      ],
    });

    await expect(
      readProjectWorkspaceForOwner({
        ownerId: OWNER_ID,
        projectId: OTHER_PROJECT_ID,
        prisma,
        query: { query: '', state: null, taskId: null },
      })
    ).resolves.toBeNull();
    await expect(
      readProjectWorkspaceForOwner({
        ownerId: OWNER_ID,
        projectId: '10000000-0000-4000-8000-000000000053',
        prisma,
        query: { query: '', state: null, taskId: null },
      })
    ).resolves.toBeNull();
    await expect(
      readProjectWorkspaceForOwner({
        ownerId: OWNER_ID,
        projectId: PROJECT_ID,
        prisma,
        query: { query: '', state: null, taskId: OTHER_TASK_ID },
      })
    ).resolves.toBeNull();
  });

  it('reads archived content with authoritative closed-session totals and Today membership', async () => {
    await prisma.task.create({
      data: {
        id: TASK_ID,
        projectId: PROJECT_ID,
        status: 'RESUMED',
        title: 'Planned archived task',
        totalSeconds: 1,
        userId: OWNER_ID,
      },
    });
    await prisma.dailyPlanItem.create({
      data: {
        planDate: new Date('2026-09-22T00:00:00.000Z'),
        position: 2,
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });
    await prisma.workSession.create({
      data: {
        correctionReason: 'Fixed imported session',
        correctedAt: NOW,
        endedAt: new Date('2026-09-22T10:45:00.000Z'),
        id: '40000000-0000-4000-8000-000000000051',
        originalEndedAt: new Date('2026-09-22T10:30:00.000Z'),
        originalStartedAt: new Date('2026-09-22T10:00:00.000Z'),
        projectId: PROJECT_ID,
        source: 'MANUAL_CORRECTION',
        startedAt: new Date('2026-09-22T10:00:00.000Z'),
        taskId: TASK_ID,
        userId: OWNER_ID,
      },
    });

    const result = await readProjectWorkspaceForOwner({
      now: NOW,
      ownerId: OWNER_ID,
      projectId: PROJECT_ID,
      prisma,
      query: { query: '', state: null, taskId: TASK_ID },
    });

    expect(result).toMatchObject({
      project: { archived: true, id: PROJECT_ID, name: 'Archived workspace' },
      summary: { cancelledCount: 0, completedCount: 0, openCount: 1, trackedSeconds: 2_700 },
      today: [{ id: TASK_ID, planPosition: 2, status: 'IN_PROGRESS', totalSeconds: 2_700 }],
    });
    expect(result?.selectedTask).toMatchObject({
      openSession: null,
      sessions: [
        {
          correctionReason: 'Fixed imported session',
          originalEndedAt: new Date('2026-09-22T10:30:00.000Z'),
          originalStartedAt: new Date('2026-09-22T10:00:00.000Z'),
        },
      ],
      task: { id: TASK_ID, totalSeconds: 2_700 },
    });
  });
});
