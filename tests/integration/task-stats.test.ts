import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import { getTaskStatsForOwner } from '../../src/actions/task';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const OWNER_ID = '00000000-0000-4000-8000-000000000021';
const PROJECT_ID = '10000000-0000-4000-8000-000000000021';
const SECOND_PROJECT_ID = '10000000-0000-4000-8000-000000000022';
const NOW = new Date('2026-09-13T13:00:00.000Z');

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
  schemaName = `p105_${process.pid}_${Date.now()}`;
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

  await prisma.user.create({
    data: {
      currentProjectId: null,
      email: 'stats-owner@example.test',
      id: OWNER_ID,
      name: 'Stats owner',
      password: 'hash',
      timezone: 'UTC',
      weekStartDay: 'MONDAY',
    },
  });
  await prisma.project.createMany({
    data: [
      { id: PROJECT_ID, name: 'Current project', ownerId: OWNER_ID },
      { id: SECOND_PROJECT_ID, name: 'Parallel project', ownerId: OWNER_ID },
    ],
  });
  await prisma.user.update({ data: { currentProjectId: PROJECT_ID }, where: { id: OWNER_ID } });
});

afterAll(async () => {
  await prisma?.$disconnect();
  if (admin) {
    await admin.query('RESET search_path');
    await admin.query(`DROP SCHEMA ${quoteIdentifier(schemaName)} CASCADE`);
    await admin.end();
  }
});

describe('canonical task statistics', () => {
  it('separates project state counts and account tracked versus unique working time', async () => {
    await prisma.task.createMany({
      data: [
        { id: '20000000-0000-4000-8000-000000000021', projectId: PROJECT_ID, title: 'Ready', userId: OWNER_ID },
        {
          id: '20000000-0000-4000-8000-000000000022',
          projectId: PROJECT_ID,
          status: 'IN_PROGRESS',
          title: 'Running',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000023',
          projectId: PROJECT_ID,
          status: 'PAUSED',
          title: 'Paused',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000024',
          projectId: PROJECT_ID,
          status: 'COMPLETED',
          title: 'Completed',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000025',
          projectId: SECOND_PROJECT_ID,
          status: 'PAUSED',
          title: 'Parallel closed',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000026',
          projectId: SECOND_PROJECT_ID,
          status: 'IN_PROGRESS',
          title: 'Parallel running',
          userId: OWNER_ID,
        },
      ],
    });
    await prisma.workSession.createMany({
      data: [
        {
          endedAt: new Date('2026-09-13T11:00:00.000Z'),
          projectId: PROJECT_ID,
          startedAt: new Date('2026-09-13T09:00:00.000Z'),
          taskId: '20000000-0000-4000-8000-000000000023',
          userId: OWNER_ID,
        },
        {
          projectId: PROJECT_ID,
          startedAt: new Date('2026-09-13T12:00:00.000Z'),
          taskId: '20000000-0000-4000-8000-000000000022',
          userId: OWNER_ID,
        },
        {
          endedAt: new Date('2026-09-13T12:00:00.000Z'),
          projectId: SECOND_PROJECT_ID,
          startedAt: new Date('2026-09-13T10:00:00.000Z'),
          taskId: '20000000-0000-4000-8000-000000000025',
          userId: OWNER_ID,
        },
        {
          projectId: SECOND_PROJECT_ID,
          startedAt: new Date('2026-09-13T12:30:00.000Z'),
          taskId: '20000000-0000-4000-8000-000000000026',
          userId: OWNER_ID,
        },
      ],
    });

    const result = await getTaskStatsForOwner({ now: NOW, ownerId: OWNER_ID, prisma });

    expect(result).toMatchObject({
      account: {
        allTime: { trackedSeconds: 19_800, uniqueWorkingSeconds: 14_400 },
        today: { trackedSeconds: 19_800, uniqueWorkingSeconds: 14_400 },
      },
      activeTasks: 2,
      completedTasks: 1,
      project: {
        allTime: { trackedSeconds: 10_800, uniqueWorkingSeconds: 10_800 },
        completedCount: 1,
        id: PROJECT_ID,
        openWorkCount: 3,
        pausedCount: 1,
        runningCount: 1,
        today: { trackedSeconds: 10_800, uniqueWorkingSeconds: 10_800 },
      },
      thisMonthTime: '3h 0m',
      thisWeekTime: '3h 0m',
      totalTime: '3h 0m',
    });
  });

  it('clips database sessions at the user-local DST day boundary', async () => {
    const taskId = '20000000-0000-4000-8000-000000000027';
    await prisma.user.update({ data: { timezone: 'America/New_York' }, where: { id: OWNER_ID } });
    await prisma.task.create({
      data: { id: taskId, projectId: PROJECT_ID, status: 'PAUSED', title: 'DST session', userId: OWNER_ID },
    });
    await prisma.workSession.create({
      data: {
        endedAt: new Date('2026-03-08T07:30:00.000Z'),
        projectId: PROJECT_ID,
        startedAt: new Date('2026-03-08T04:30:00.000Z'),
        taskId,
        userId: OWNER_ID,
      },
    });

    const result = await getTaskStatsForOwner({
      now: new Date('2026-03-08T16:00:00.000Z'),
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result.project?.today).toEqual({ trackedSeconds: 9_000, uniqueWorkingSeconds: 9_000 });
    expect(result.account.today).toEqual({ trackedSeconds: 9_000, uniqueWorkingSeconds: 9_000 });
  });
});
