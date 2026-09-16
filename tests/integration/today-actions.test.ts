import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import { createTodayTaskInputSchema, todayMutationSchema } from '../../src/schema/today';
import { createTodayTaskForOwner, mutateTodayForOwner } from '../../src/server/today/mutate-today';
import { readTodayForOwner } from '../../src/server/today/read-today';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const OWNER_ID = '00000000-0000-4000-8000-000000000031';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000032';
const PROJECT_A_ID = '10000000-0000-4000-8000-000000000031';
const PROJECT_B_ID = '10000000-0000-4000-8000-000000000032';
const ARCHIVED_PROJECT_ID = '10000000-0000-4000-8000-000000000033';
const OTHER_PROJECT_ID = '10000000-0000-4000-8000-000000000034';
const PROJECT_C_ID = '10000000-0000-4000-8000-000000000035';
const PLAN_DATE = new Date('2026-09-15T00:00:00.000Z');
const NOW = new Date('2026-09-15T12:30:00.000Z');

let admin: Client;
let prisma: PrismaClient;
let schemaName: string;

jest.setTimeout(60_000);

const quoteIdentifier = (value: string): string => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
};

const serializedOverlap = () => {
  let firstLocked!: () => void;
  let secondStarted!: () => void;
  const firstHasLock = new Promise<void>((resolve) => {
    firstLocked = resolve;
  });
  const secondHasStarted = new Promise<void>((resolve) => {
    secondStarted = resolve;
  });

  return {
    first: {
      afterOwnerLock: async () => {
        firstLocked();
        await secondHasStarted;
      },
    },
    second: {
      beforeTransaction: async () => {
        await firstHasLock;
        secondStarted();
      },
    },
  };
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
  await prisma.todayMutationReceipt.deleteMany();
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
      {
        dailyCapacityMinutes: 120,
        email: 'today-owner@example.test',
        id: OWNER_ID,
        name: 'Today owner',
        password: 'hash',
        timezone: 'UTC',
      },
      {
        dailyCapacityMinutes: 480,
        email: 'today-other@example.test',
        id: OTHER_OWNER_ID,
        name: 'Other owner',
        password: 'hash',
        timezone: 'Pacific/Kiritimati',
      },
    ],
  });
  await prisma.project.createMany({
    data: [
      { id: PROJECT_A_ID, name: 'Alpha', ownerId: OWNER_ID },
      { id: PROJECT_B_ID, name: 'Beta', ownerId: OWNER_ID },
      { id: PROJECT_C_ID, name: 'Gamma without tasks', ownerId: OWNER_ID },
      { archived: true, archivedAt: NOW, id: ARCHIVED_PROJECT_ID, name: 'Archived', ownerId: OWNER_ID },
      { id: OTHER_PROJECT_ID, name: 'Private', ownerId: OTHER_OWNER_ID },
    ],
  });
};

beforeAll(async () => {
  schemaName = `t301_${process.pid}_${Date.now()}`;
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

describe('Today read model', () => {
  it('isolates the owner, excludes archived backlog tasks, and orders plan ties deterministically', async () => {
    await prisma.task.createMany({
      data: [
        {
          createdAt: new Date('2026-09-10T08:00:00.000Z'),
          id: '20000000-0000-4000-8000-000000000031',
          projectId: PROJECT_A_ID,
          title: 'Position zero',
          userId: OWNER_ID,
        },
        {
          createdAt: new Date('2026-09-10T09:00:00.000Z'),
          id: '20000000-0000-4000-8000-000000000032',
          projectId: PROJECT_B_ID,
          title: 'Tie first by item id',
          userId: OWNER_ID,
        },
        {
          createdAt: new Date('2026-09-10T09:00:00.000Z'),
          id: '20000000-0000-4000-8000-000000000033',
          projectId: PROJECT_A_ID,
          title: 'Tie second by item id',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000034',
          projectId: PROJECT_A_ID,
          title: 'Owned backlog',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000035',
          projectId: ARCHIVED_PROJECT_ID,
          title: 'Archived backlog',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000036',
          projectId: OTHER_PROJECT_ID,
          title: 'Foreign task',
          userId: OTHER_OWNER_ID,
        },
      ],
    });
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          id: '30000000-0000-4000-8000-000000000031',
          planDate: PLAN_DATE,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: '20000000-0000-4000-8000-000000000031',
          userId: OWNER_ID,
        },
        {
          createdAt: new Date('2026-09-14T09:00:00.000Z'),
          id: '30000000-0000-4000-8000-000000000032',
          planDate: PLAN_DATE,
          position: 2,
          projectId: PROJECT_B_ID,
          taskId: '20000000-0000-4000-8000-000000000032',
          userId: OWNER_ID,
        },
        {
          createdAt: new Date('2026-09-14T09:00:00.000Z'),
          id: '30000000-0000-4000-8000-000000000033',
          planDate: PLAN_DATE,
          position: 2,
          projectId: PROJECT_A_ID,
          taskId: '20000000-0000-4000-8000-000000000033',
          userId: OWNER_ID,
        },
        {
          id: '30000000-0000-4000-8000-000000000036',
          planDate: PLAN_DATE,
          position: 0,
          projectId: OTHER_PROJECT_ID,
          taskId: '20000000-0000-4000-8000-000000000036',
          userId: OTHER_OWNER_ID,
        },
      ],
    });

    const result = await readTodayForOwner({ ownerId: OWNER_ID, planDate: '2026-09-15', prisma });

    expect(result.items.map(({ taskId }) => taskId)).toEqual([
      '20000000-0000-4000-8000-000000000031',
      '20000000-0000-4000-8000-000000000032',
      '20000000-0000-4000-8000-000000000033',
    ]);
    expect(result.backlog.map(({ title }) => title)).toEqual(['Owned backlog']);
    expect(result.projects).toEqual([
      { id: PROJECT_A_ID, name: 'Alpha' },
      { id: PROJECT_B_ID, name: 'Beta' },
      { id: PROJECT_C_ID, name: 'Gamma without tasks' },
    ]);
    expect(JSON.stringify(result)).not.toContain('Foreign task');
    expect(JSON.stringify(result)).not.toContain('Archived backlog');
  });

  it('accumulates closed and open session time, selects the newest running focus, and returns every running project', async () => {
    await prisma.task.createMany({
      data: [
        {
          id: '20000000-0000-4000-8000-000000000041',
          projectId: PROJECT_A_ID,
          status: 'IN_PROGRESS',
          title: 'Planned runner',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000042',
          projectId: PROJECT_B_ID,
          status: 'RESUMED',
          title: 'Newest runner',
          userId: OWNER_ID,
        },
      ],
    });
    await prisma.dailyPlanItem.create({
      data: {
        id: '30000000-0000-4000-8000-000000000041',
        planDate: PLAN_DATE,
        plannedMinutes: 90,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId: '20000000-0000-4000-8000-000000000041',
        userId: OWNER_ID,
      },
    });
    await prisma.workSession.createMany({
      data: [
        {
          endedAt: new Date('2026-09-15T10:00:00.000Z'),
          id: '40000000-0000-4000-8000-000000000041',
          projectId: PROJECT_A_ID,
          startedAt: new Date('2026-09-15T09:00:00.000Z'),
          taskId: '20000000-0000-4000-8000-000000000041',
          userId: OWNER_ID,
        },
        {
          id: '40000000-0000-4000-8000-000000000042',
          projectId: PROJECT_A_ID,
          startedAt: new Date('2026-09-15T11:00:00.000Z'),
          taskId: '20000000-0000-4000-8000-000000000041',
          userId: OWNER_ID,
        },
        {
          id: '40000000-0000-4000-8000-000000000043',
          projectId: PROJECT_B_ID,
          startedAt: new Date('2026-09-15T12:00:00.000Z'),
          taskId: '20000000-0000-4000-8000-000000000042',
          userId: OWNER_ID,
        },
      ],
    });

    const result = await readTodayForOwner({
      clock: () => NOW,
      ownerId: OWNER_ID,
      planDate: '2026-09-15',
      prisma,
    });

    expect(result.items[0]).toMatchObject({ actualSeconds: 9_000, openSessionStartedAt: '2026-09-15T11:00:00.000Z' });
    expect(result.focus).toMatchObject({ plannedMinutes: null, taskId: '20000000-0000-4000-8000-000000000042' });
    expect(result.runningIndicators.map(({ project, taskId }) => [project.name, taskId])).toEqual([
      ['Beta', '20000000-0000-4000-8000-000000000042'],
      ['Alpha', '20000000-0000-4000-8000-000000000041'],
    ]);
    expect(result.runningIndicators.map(({ elapsedSeconds }) => elapsedSeconds)).toEqual([1_800, 5_400]);
    expect(result.generatedAt).toBe(NOW.toISOString());
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it.each([
    { capacity: null, expected: 'unset', plannedMinutes: 60 },
    { capacity: 120, expected: 'under', plannedMinutes: 60 },
    { capacity: 120, expected: 'near', plannedMinutes: 96 },
    { capacity: 120, expected: 'over', plannedMinutes: 121 },
  ] as const)(
    'reports $expected workload for $plannedMinutes planned minutes against capacity $capacity',
    async ({ capacity, expected, plannedMinutes }) => {
      const taskId = '20000000-0000-4000-8000-000000000051';
      await prisma.user.update({ data: { dailyCapacityMinutes: capacity }, where: { id: OWNER_ID } });
      await prisma.task.create({
        data: { id: taskId, projectId: PROJECT_A_ID, title: 'Capacity task', userId: OWNER_ID },
      });
      await prisma.dailyPlanItem.create({
        data: {
          planDate: PLAN_DATE,
          plannedMinutes,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId,
          userId: OWNER_ID,
        },
      });

      const result = await readTodayForOwner({ ownerId: OWNER_ID, planDate: '2026-09-15', prisma });

      expect(result.workload).toMatchObject({ capacityMinutes: capacity, plannedMinutes, state: expected });
    }
  );

  it('returns unfinished prior work as carryover and falls back to the first open Today item for focus', async () => {
    await prisma.task.createMany({
      data: [
        {
          id: '20000000-0000-4000-8000-000000000061',
          projectId: PROJECT_A_ID,
          status: 'COMPLETED',
          title: 'Completed Today',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000062',
          projectId: PROJECT_B_ID,
          status: 'PAUSED',
          title: 'Open Today',
          userId: OWNER_ID,
        },
        {
          id: '20000000-0000-4000-8000-000000000063',
          projectId: PROJECT_A_ID,
          status: 'READY',
          title: 'Carry this',
          userId: OWNER_ID,
        },
      ],
    });
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          outcome: 'COMPLETED',
          planDate: PLAN_DATE,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: '20000000-0000-4000-8000-000000000061',
          userId: OWNER_ID,
        },
        {
          outcome: 'OPEN',
          planDate: PLAN_DATE,
          position: 1,
          projectId: PROJECT_B_ID,
          taskId: '20000000-0000-4000-8000-000000000062',
          userId: OWNER_ID,
        },
        {
          outcome: 'OPEN',
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          plannedMinutes: 45,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: '20000000-0000-4000-8000-000000000063',
          userId: OWNER_ID,
        },
      ],
    });

    const result = await readTodayForOwner({ ownerId: OWNER_ID, planDate: '2026-09-15', prisma });

    expect(result.focus).toMatchObject({ taskId: '20000000-0000-4000-8000-000000000062' });
    expect(result.carryover).toEqual([
      expect.objectContaining({
        plannedMinutes: 45,
        sourcePlanDate: '2026-09-14',
        taskId: '20000000-0000-4000-8000-000000000063',
      }),
    ]);
  });
});

describe('Today planning commands', () => {
  const createTask = async (id: string, ownerId = OWNER_ID, projectId = PROJECT_A_ID) =>
    prisma.task.create({ data: { id, projectId, title: id, userId: ownerId } });

  it('adds an owned task once and returns the canonical plan', async () => {
    const taskId = '20000000-0000-4000-8000-000000000091';
    await prisma.task.create({ data: { id: taskId, projectId: PROJECT_A_ID, title: 'Plan me', userId: OWNER_ID } });

    const first = await mutateTodayForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-15', taskId, type: 'ADD', plannedMinutes: 30 },
      ownerId: OWNER_ID,
      prisma,
    });
    const second = await mutateTodayForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-15', taskId, type: 'ADD', plannedMinutes: 60 },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(first).toMatchObject({
      data: { items: [{ plannedMinutes: 30, position: 0, taskId }], planDate: '2026-09-15' },
      ok: true,
    });
    expect(second).toMatchObject({ data: { items: [{ plannedMinutes: 30, position: 0, taskId }] }, ok: true });
    await expect(prisma.dailyPlanItem.count({ where: { taskId } })).resolves.toBe(1);
  });

  it('returns the actual full canonical model after mutate retry exhaustion without writing', async () => {
    const taskId = '20000000-0000-4000-8000-000000000113';
    await createTask(taskId);
    await prisma.dailyPlanItem.create({
      data: { planDate: PLAN_DATE, plannedMinutes: 25, position: 0, projectId: PROJECT_A_ID, taskId, userId: OWNER_ID },
    });
    const before = await prisma.dailyPlanItem.findMany({ where: { taskId } });
    const transaction = jest.spyOn(prisma as any, '$transaction').mockRejectedValue({ code: '40001' });

    let result;
    let transactionCalls = 0;
    try {
      result = await mutateTodayForOwner({
        clock: () => NOW,
        input: { planDate: '2026-09-15', taskId, type: 'ADD', plannedMinutes: 90 },
        ownerId: OWNER_ID,
        prisma,
      });
    } finally {
      transactionCalls = transaction.mock.calls.length;
      transaction.mockRestore();
    }

    expect(transactionCalls).toBe(2);
    expect(result).toMatchObject({
      canonical: { items: [{ plannedMinutes: 25, position: 0, taskId }], planDate: '2026-09-15' },
      error: { code: 'CONFLICT', retryable: true },
      ok: false,
    });
    await expect(prisma.dailyPlanItem.findMany({ where: { taskId } })).resolves.toEqual(before);
  });

  it('reactivates a returned membership on re-add while preserving active duplicate values', async () => {
    const taskId = '20000000-0000-4000-8000-000000000090';
    await createTask(taskId);
    await mutateTodayForOwner({
      input: { planDate: '2026-09-15', plannedMinutes: 30, taskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });
    await mutateTodayForOwner({
      input: { planDate: '2026-09-15', taskId, type: 'RETURN_TO_BACKLOG' },
      ownerId: OWNER_ID,
      prisma,
    });
    const result = await mutateTodayForOwner({
      input: { planDate: '2026-09-15', plannedMinutes: 75, taskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({ data: { items: [{ plannedMinutes: 75, position: 0, taskId }] }, ok: true });
    await expect(prisma.dailyPlanItem.count({ where: { taskId } })).resolves.toBe(1);
  });

  it('reactivates a carried membership on re-add with the requested minutes and a compacted position', async () => {
    const taskId = '20000000-0000-4000-8000-000000000100';
    const otherTaskId = '20000000-0000-4000-8000-000000000101';
    await Promise.all([createTask(taskId), createTask(otherTaskId)]);
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          plannedMinutes: 25,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId,
          userId: OWNER_ID,
        },
        {
          outcome: 'CARRIED',
          planDate: PLAN_DATE,
          plannedMinutes: 40,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId,
          userId: OWNER_ID,
        },
        {
          planDate: PLAN_DATE,
          plannedMinutes: 10,
          position: 1,
          projectId: PROJECT_A_ID,
          taskId: otherTaskId,
          userId: OWNER_ID,
        },
      ],
    });
    await mutateTodayForOwner({
      input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId, type: 'KEEP_TODAY' },
      ownerId: OWNER_ID,
      prisma,
    });
    const result = await mutateTodayForOwner({
      input: { planDate: '2026-09-15', plannedMinutes: 75, taskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        items: [
          { plannedMinutes: 10, position: 0, taskId: otherTaskId },
          { plannedMinutes: 75, position: 1, taskId },
        ],
      },
      ok: true,
    });
    await expect(
      prisma.dailyPlanItem.findUnique({
        where: { userId_taskId_planDate: { planDate: PLAN_DATE, taskId, userId: OWNER_ID } },
      })
    ).resolves.toMatchObject({ outcome: 'OPEN', plannedMinutes: 75, position: 1 });
  });

  it('updates nullable planned minutes at both inclusive boundaries', async () => {
    const taskId = '20000000-0000-4000-8000-000000000092';
    await createTask(taskId);
    await mutateTodayForOwner({ input: { planDate: '2026-09-15', taskId, type: 'ADD' }, ownerId: OWNER_ID, prisma });

    for (const plannedMinutes of [1, 1440, null] as const) {
      const result = await mutateTodayForOwner({
        input: { planDate: '2026-09-15', plannedMinutes, taskId, type: 'SET_PLANNED_MINUTES' },
        ownerId: OWNER_ID,
        prisma,
      });
      expect(result).toMatchObject({ data: { items: [{ plannedMinutes, taskId }] }, ok: true });
    }
  });

  it('rejects invalid minute values and impossible mutation dates before opening a transaction', async () => {
    const taskId = '20000000-0000-4000-8000-000000000089';
    await createTask(taskId);
    expect(
      todayMutationSchema.safeParse({ planDate: '2026-09-15', plannedMinutes: 0, taskId, type: 'ADD' }).success
    ).toBe(false);
    expect(todayMutationSchema.safeParse({ planDate: '2026-02-30', taskId, type: 'ADD' }).success).toBe(true);
    await expect(
      mutateTodayForOwner({ input: { planDate: '2026-02-30', taskId, type: 'ADD' }, ownerId: OWNER_ID, prisma })
    ).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' }, ok: false });
    await expect(prisma.dailyPlanItem.count({ where: { taskId } })).resolves.toBe(0);
  });

  it('moves one step or to an explicit position and compacts after returning to backlog', async () => {
    const taskIds = [
      '20000000-0000-4000-8000-000000000093',
      '20000000-0000-4000-8000-000000000094',
      '20000000-0000-4000-8000-000000000095',
    ];
    await Promise.all(taskIds.map((id) => createTask(id)));
    for (const taskId of taskIds) {
      await mutateTodayForOwner({ input: { planDate: '2026-09-15', taskId, type: 'ADD' }, ownerId: OWNER_ID, prisma });
    }

    await mutateTodayForOwner({
      input: { direction: 'UP', planDate: '2026-09-15', taskId: taskIds[2], type: 'MOVE' },
      ownerId: OWNER_ID,
      prisma,
    });
    const moved = await mutateTodayForOwner({
      input: { planDate: '2026-09-15', position: 1, taskId: taskIds[0], type: 'MOVE' },
      ownerId: OWNER_ID,
      prisma,
    });
    expect(moved).toMatchObject({
      data: {
        items: [
          { position: 0, taskId: taskIds[2] },
          { position: 1, taskId: taskIds[0] },
          { position: 2, taskId: taskIds[1] },
        ],
      },
      ok: true,
    });

    const removed = await mutateTodayForOwner({
      input: { planDate: '2026-09-15', taskId: taskIds[0], type: 'RETURN_TO_BACKLOG' },
      ownerId: OWNER_ID,
      prisma,
    });
    expect(removed).toMatchObject({
      data: {
        items: [
          { position: 0, taskId: taskIds[2] },
          { position: 1, taskId: taskIds[1] },
        ],
      },
      ok: true,
    });
  });

  it('moves across dates without duplicating an existing target membership', async () => {
    const taskId = '20000000-0000-4000-8000-000000000096';
    await createTask(taskId);
    await mutateTodayForOwner({
      input: { planDate: '2026-09-14', plannedMinutes: 30, taskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });
    await mutateTodayForOwner({
      input: { planDate: '2026-09-15', plannedMinutes: 90, taskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });

    const result = await mutateTodayForOwner({
      input: {
        planDate: '2026-09-14',
        targetPlanDate: '2026-09-15',
        taskId,
        type: 'MOVE_TO_DATE',
        viewPlanDate: '2026-09-15',
      },
      ownerId: OWNER_ID,
      prisma,
    });
    expect(result).toMatchObject({ data: { planDate: '2026-09-15' }, ok: true });
    await expect(
      prisma.dailyPlanItem.findUnique({
        where: { userId_taskId_planDate: { planDate: PLAN_DATE, taskId, userId: OWNER_ID } },
      })
    ).resolves.toMatchObject({ plannedMinutes: 90 });
    await expect(prisma.dailyPlanItem.count({ where: { taskId } })).resolves.toBe(1);

    const replay = await mutateTodayForOwner({
      input: { planDate: '2026-09-14', targetPlanDate: '2026-09-15', taskId, type: 'MOVE_TO_DATE' },
      ownerId: OWNER_ID,
      prisma,
    });
    expect(replay).toMatchObject({ data: { planDate: '2026-09-14', items: [] }, ok: true });
  });

  it('moves to an empty date while preserving planned minutes and appending at the target position', async () => {
    const taskId = '20000000-0000-4000-8000-000000000102';
    const targetTaskId = '20000000-0000-4000-8000-000000000103';
    await Promise.all([createTask(taskId), createTask(targetTaskId)]);
    await prisma.dailyPlanItem.create({
      data: {
        planDate: new Date('2026-09-14T00:00:00.000Z'),
        plannedMinutes: 55,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId,
        userId: OWNER_ID,
      },
    });
    await prisma.dailyPlanItem.create({
      data: {
        planDate: PLAN_DATE,
        plannedMinutes: 20,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId: targetTaskId,
        userId: OWNER_ID,
      },
    });

    const result = await mutateTodayForOwner({
      input: { planDate: '2026-09-14', targetPlanDate: '2026-09-15', taskId, type: 'MOVE_TO_DATE' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: { planDate: '2026-09-14', items: [] },
      ok: true,
    });
    await expect(
      prisma.dailyPlanItem.findUnique({
        where: { userId_taskId_planDate: { planDate: PLAN_DATE, taskId, userId: OWNER_ID } },
      })
    ).resolves.toMatchObject({ plannedMinutes: 55, position: 1, outcome: 'OPEN' });
  });

  it('keeps existing target values when carrying and replays without new history', async () => {
    const taskId = '20000000-0000-4000-8000-000000000088';
    await createTask(taskId);
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          plannedMinutes: 30,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId,
          userId: OWNER_ID,
        },
        { planDate: PLAN_DATE, plannedMinutes: 90, position: 2, projectId: PROJECT_A_ID, taskId, userId: OWNER_ID },
      ],
    });

    const first = await mutateTodayForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId, type: 'KEEP_TODAY' },
      ownerId: OWNER_ID,
      prisma,
    });
    const second = await mutateTodayForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId, type: 'KEEP_TODAY' },
      ownerId: OWNER_ID,
      prisma,
    });
    expect(first).toMatchObject({ data: { items: [{ plannedMinutes: 90, position: 2, taskId }] }, ok: true });
    expect(second).toEqual(first);
    await expect(prisma.dailyPlanItem.count({ where: { taskId } })).resolves.toBe(2);
  });

  it('copies planned minutes and appends a new OPEN target when keeping an item', async () => {
    const taskId = '20000000-0000-4000-8000-000000000110';
    const targetTaskId = '20000000-0000-4000-8000-000000000111';
    await Promise.all([createTask(taskId), createTask(targetTaskId)]);
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          plannedMinutes: 35,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId,
          userId: OWNER_ID,
        },
        {
          planDate: PLAN_DATE,
          plannedMinutes: 20,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: targetTaskId,
          userId: OWNER_ID,
        },
      ],
    });

    const result = await mutateTodayForOwner({
      input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId, type: 'KEEP_TODAY' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        items: [
          { position: 0, taskId: targetTaskId },
          { plannedMinutes: 35, position: 1, taskId },
        ],
      },
      ok: true,
    });
    await expect(
      prisma.dailyPlanItem.findUnique({
        where: { userId_taskId_planDate: { planDate: PLAN_DATE, taskId, userId: OWNER_ID } },
      })
    ).resolves.toMatchObject({ outcome: 'OPEN', plannedMinutes: 35, position: 1 });
    await expect(
      prisma.dailyPlanItem.findUnique({
        where: { userId_taskId_planDate: { planDate: new Date('2026-09-14T00:00:00.000Z'), taskId, userId: OWNER_ID } },
      })
    ).resolves.toMatchObject({ outcome: 'CARRIED' });
    await expect(prisma.dailyPlanItem.count({ where: { userId: OWNER_ID, taskId } })).resolves.toBe(2);
  });

  it('replays RETURN_TO_BACKLOG successfully without further mutation', async () => {
    const taskId = '20000000-0000-4000-8000-000000000104';
    await createTask(taskId);
    await mutateTodayForOwner({
      input: { planDate: '2026-09-15', plannedMinutes: 30, taskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });
    const first = await mutateTodayForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-15', taskId, type: 'RETURN_TO_BACKLOG' },
      ownerId: OWNER_ID,
      prisma,
    });
    const before = await prisma.dailyPlanItem.findUniqueOrThrow({
      where: { userId_taskId_planDate: { planDate: PLAN_DATE, taskId, userId: OWNER_ID } },
    });
    const second = await mutateTodayForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-15', taskId, type: 'RETURN_TO_BACKLOG' },
      ownerId: OWNER_ID,
      prisma,
    });
    const after = await prisma.dailyPlanItem.findUniqueOrThrow({
      where: { userId_taskId_planDate: { planDate: PLAN_DATE, taskId, userId: OWNER_ID } },
    });

    expect(second).toEqual(first);
    expect(after).toEqual(before);
  });

  it('does not change task, session, or work-log state while scheduling', async () => {
    const taskId = '20000000-0000-4000-8000-000000000082';
    await createTask(taskId);
    await prisma.workSession.create({
      data: {
        endedAt: new Date('2026-09-15T11:00:00.000Z'),
        projectId: PROJECT_A_ID,
        startedAt: new Date('2026-09-15T10:00:00.000Z'),
        taskId,
        userId: OWNER_ID,
      },
    });
    await prisma.workLogEntry.create({
      data: { content: 'before', kind: 'NOTE', projectId: PROJECT_A_ID, taskId, userId: OWNER_ID },
    });
    const before = await Promise.all([
      prisma.task.findUniqueOrThrow({ where: { id: taskId } }),
      prisma.workSession.findMany({ where: { taskId } }),
      prisma.workLogEntry.findMany({ where: { taskId } }),
    ]);

    await mutateTodayForOwner({ input: { planDate: '2026-09-15', taskId, type: 'ADD' }, ownerId: OWNER_ID, prisma });

    await expect(
      Promise.all([
        prisma.task.findUniqueOrThrow({ where: { id: taskId } }),
        prisma.workSession.findMany({ where: { taskId } }),
        prisma.workLogEntry.findMany({ where: { taskId } }),
      ])
    ).resolves.toEqual(before);
  });

  it('keeps task, session, and work-log state unchanged across every scheduling command', async () => {
    const taskId = '20000000-0000-4000-8000-000000000114';
    const secondTaskId = '20000000-0000-4000-8000-000000000115';
    const carryTaskId = '20000000-0000-4000-8000-000000000116';
    await Promise.all([createTask(taskId), createTask(secondTaskId), createTask(carryTaskId)]);
    await prisma.workSession.create({
      data: {
        endedAt: new Date('2026-09-15T11:00:00.000Z'),
        projectId: PROJECT_A_ID,
        startedAt: new Date('2026-09-15T10:00:00.000Z'),
        taskId,
        userId: OWNER_ID,
      },
    });
    await prisma.workLogEntry.create({
      data: { content: 'invariant', kind: 'NOTE', projectId: PROJECT_A_ID, taskId, userId: OWNER_ID },
    });
    await prisma.dailyPlanItem.createMany({
      data: [
        { planDate: PLAN_DATE, plannedMinutes: 30, position: 0, projectId: PROJECT_A_ID, taskId, userId: OWNER_ID },
        {
          planDate: PLAN_DATE,
          plannedMinutes: 20,
          position: 1,
          projectId: PROJECT_A_ID,
          taskId: secondTaskId,
          userId: OWNER_ID,
        },
        {
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          plannedMinutes: 15,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: carryTaskId,
          userId: OWNER_ID,
        },
      ],
    });

    const snapshot = async () =>
      Promise.all([
        prisma.task.findMany({ orderBy: { id: 'asc' }, where: { id: { in: [taskId, secondTaskId, carryTaskId] } } }),
        prisma.workSession.findMany({ orderBy: { id: 'asc' }, where: { taskId } }),
        prisma.workLogEntry.findMany({ orderBy: { id: 'asc' }, where: { taskId } }),
      ]);
    const commands = [
      { planDate: '2026-09-15', position: 1, taskId, type: 'MOVE' as const },
      { planDate: '2026-09-15', plannedMinutes: 40, taskId, type: 'SET_PLANNED_MINUTES' as const },
      { planDate: '2026-09-15', taskId, type: 'RETURN_TO_BACKLOG' as const },
      { planDate: '2026-09-15', plannedMinutes: 50, taskId, type: 'ADD' as const },
      { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId: carryTaskId, type: 'KEEP_TODAY' as const },
    ];
    for (const input of commands) {
      const before = await snapshot();
      await mutateTodayForOwner({ input, ownerId: OWNER_ID, prisma });
      await expect(snapshot()).resolves.toEqual(before);
    }
  });

  it('rolls back a mutation when the injected post-write failure aborts its transaction', async () => {
    const taskId = '20000000-0000-4000-8000-000000000081';
    await createTask(taskId);
    const failingPrisma = prisma.$extends({
      query: {
        dailyPlanItem: {
          async create({ args, query }: any) {
            await query(args);
            throw new Error('injected rollback');
          },
        },
      },
    });

    await expect(
      mutateTodayForOwner({
        input: { planDate: '2026-09-15', taskId, type: 'ADD' },
        ownerId: OWNER_ID,
        prisma: failingPrisma as unknown as PrismaClient,
      })
    ).rejects.toThrow('injected rollback');
    await expect(prisma.dailyPlanItem.count({ where: { taskId } })).resolves.toBe(0);
  });

  it('rolls back source movement and compaction after an injected intermediate write failure', async () => {
    const taskId = '20000000-0000-4000-8000-000000000105';
    const remainingTaskId = '20000000-0000-4000-8000-000000000106';
    await Promise.all([createTask(taskId), createTask(remainingTaskId)]);
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          plannedMinutes: 35,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId,
          userId: OWNER_ID,
        },
        {
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          plannedMinutes: 20,
          position: 1,
          projectId: PROJECT_A_ID,
          taskId: remainingTaskId,
          userId: OWNER_ID,
        },
      ],
    });
    let updates = 0;
    const failingPrisma = prisma.$extends({
      query: {
        dailyPlanItem: {
          async update({ args, query }: any) {
            await query(args);
            updates += 1;
            if (updates === 2) throw new Error('injected late compaction rollback');
            return undefined;
          },
        },
      },
    });

    await expect(
      mutateTodayForOwner({
        input: { planDate: '2026-09-14', targetPlanDate: '2026-09-15', taskId, type: 'MOVE_TO_DATE' },
        ownerId: OWNER_ID,
        prisma: failingPrisma as unknown as PrismaClient,
      })
    ).rejects.toThrow('injected late compaction rollback');
    await expect(
      prisma.dailyPlanItem.findMany({ orderBy: { position: 'asc' }, where: { userId: OWNER_ID } })
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ planDate: new Date('2026-09-14T00:00:00.000Z'), position: 0, taskId }),
        expect.objectContaining({
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          position: 1,
          taskId: remainingTaskId,
        }),
      ])
    );
    await expect(
      prisma.dailyPlanItem.findUnique({
        where: { userId_taskId_planDate: { planDate: PLAN_DATE, taskId, userId: OWNER_ID } },
      })
    ).resolves.toBeNull();
  });

  it('rolls back KEEP target creation and source resolution after a later write failure', async () => {
    const taskId = '20000000-0000-4000-8000-000000000112';
    await createTask(taskId);
    await prisma.dailyPlanItem.create({
      data: {
        planDate: new Date('2026-09-14T00:00:00.000Z'),
        plannedMinutes: 35,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId,
        userId: OWNER_ID,
      },
    });
    const before = await prisma.dailyPlanItem.findMany({ where: { taskId } });
    const failingPrisma = prisma.$extends({
      query: {
        dailyPlanItem: {
          async update({ args, query }: any) {
            await query(args);
            throw new Error('injected KEEP rollback');
          },
        },
      },
    });

    await expect(
      mutateTodayForOwner({
        input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId, type: 'KEEP_TODAY' },
        ownerId: OWNER_ID,
        prisma: failingPrisma as unknown as PrismaClient,
      })
    ).rejects.toThrow('injected KEEP rollback');
    await expect(prisma.dailyPlanItem.findMany({ where: { taskId } })).resolves.toEqual(before);
  });

  it.each([
    { type: 'KEEP_TODAY' as const, expected: 'CARRIED' as const },
    { type: 'RETURN_TO_BACKLOG' as const, expected: 'RETURNED_TO_BACKLOG' as const },
  ])('resolves unfinished prior work with $type without changing task execution state', async ({ expected, type }) => {
    const taskId =
      type === 'KEEP_TODAY' ? '20000000-0000-4000-8000-000000000097' : '20000000-0000-4000-8000-000000000098';
    await createTask(taskId);
    await mutateTodayForOwner({
      input: { planDate: '2026-09-14', plannedMinutes: 45, taskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });

    const result = await mutateTodayForOwner({
      input:
        type === 'KEEP_TODAY'
          ? { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId, type }
          : { planDate: '2026-09-14', taskId, type },
      ownerId: OWNER_ID,
      prisma,
    });
    expect(result.ok).toBe(true);
    await expect(
      prisma.dailyPlanItem.findFirst({ orderBy: { planDate: 'asc' }, where: { taskId } })
    ).resolves.toMatchObject({ outcome: expected });
    await expect(prisma.task.findUniqueOrThrow({ where: { id: taskId } })).resolves.toMatchObject({ status: 'READY' });
  });

  it('replays KEEP_TODAY from a carried source after the task becomes ineligible', async () => {
    const taskId = '20000000-0000-4000-8000-000000000107';
    await createTask(taskId);
    await mutateTodayForOwner({
      input: { planDate: '2026-09-14', plannedMinutes: 45, taskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });
    const first = await mutateTodayForOwner({
      input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId, type: 'KEEP_TODAY' },
      ownerId: OWNER_ID,
      prisma,
    });
    const beforeReplay = await prisma.dailyPlanItem.findMany({ orderBy: { planDate: 'asc' }, where: { taskId } });
    await prisma.task.update({ data: { status: 'COMPLETED' }, where: { id: taskId } });
    await prisma.project.update({ data: { archived: true, archivedAt: NOW }, where: { id: PROJECT_A_ID } });

    const replay = await mutateTodayForOwner({
      input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId, type: 'KEEP_TODAY' },
      ownerId: OWNER_ID,
      prisma,
    });
    expect(first).toMatchObject({ ok: true });
    expect(replay).toMatchObject({ data: { planDate: '2026-09-15' }, ok: true });
    await expect(prisma.dailyPlanItem.findMany({ orderBy: { planDate: 'asc' }, where: { taskId } })).resolves.toEqual(
      beforeReplay
    );
  });

  it.each([
    { sourcePlanDate: '2026-09-15', planDate: '2026-09-15', label: 'same-day' },
    { sourcePlanDate: '2026-09-16', planDate: '2026-09-15', label: 'future-source' },
  ])('rejects $label KEEP_TODAY without mutation', async ({ planDate, sourcePlanDate }) => {
    const taskId = '20000000-0000-4000-8000-000000000087';
    await createTask(taskId);
    const sourceDate = new Date(`${sourcePlanDate}T00:00:00.000Z`);
    await prisma.dailyPlanItem.create({
      data: {
        planDate: sourceDate,
        plannedMinutes: 20,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId,
        userId: OWNER_ID,
      },
    });
    const before = await prisma.dailyPlanItem.findMany({ where: { taskId } });

    const result = await mutateTodayForOwner({
      input: { planDate, sourcePlanDate, taskId, type: 'KEEP_TODAY' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR', retryable: false }, ok: false });
    await expect(prisma.dailyPlanItem.findMany({ where: { taskId } })).resolves.toEqual(before);
  });

  it('rejects KEEP_TODAY for a terminal task and excludes archived tasks from ADD', async () => {
    const terminalId = '20000000-0000-4000-8000-000000000086';
    const archivedId = '20000000-0000-4000-8000-000000000085';
    await createTask(terminalId);
    await createTask(archivedId, OWNER_ID, ARCHIVED_PROJECT_ID);
    await prisma.task.update({ data: { status: 'COMPLETED' }, where: { id: terminalId } });
    await prisma.dailyPlanItem.create({
      data: {
        planDate: new Date('2026-09-14T00:00:00.000Z'),
        plannedMinutes: 20,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId: terminalId,
        userId: OWNER_ID,
      },
    });
    await prisma.dailyPlanItem.create({
      data: {
        planDate: new Date('2026-09-14T00:00:00.000Z'),
        plannedMinutes: 20,
        position: 1,
        projectId: ARCHIVED_PROJECT_ID,
        taskId: archivedId,
        userId: OWNER_ID,
      },
    });

    await expect(
      mutateTodayForOwner({
        input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId: terminalId, type: 'KEEP_TODAY' },
        ownerId: OWNER_ID,
        prisma,
      })
    ).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR', retryable: false }, ok: false });
    await expect(
      mutateTodayForOwner({
        input: { planDate: '2026-09-15', taskId: archivedId, type: 'ADD' },
        ownerId: OWNER_ID,
        prisma,
      })
    ).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR', retryable: false }, ok: false });
    await expect(
      mutateTodayForOwner({
        input: { planDate: '2026-09-15', sourcePlanDate: '2026-09-14', taskId: archivedId, type: 'KEEP_TODAY' },
        ownerId: OWNER_ID,
        prisma,
      })
    ).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR', retryable: false }, ok: false });
  });

  it('serializes concurrent additions to an initially empty date', async () => {
    const taskIds = ['20000000-0000-4000-8000-000000000083', '20000000-0000-4000-8000-000000000084'];
    await Promise.all(taskIds.map((id) => createTask(id)));
    const overlap = serializedOverlap();
    const resultsPromise = Promise.all(
      taskIds.map((taskId, index) =>
        mutateTodayForOwner({
          ...(index === 0 ? overlap.first : overlap.second),
          input: { planDate: '2026-09-16', taskId, type: 'ADD' },
          ownerId: OWNER_ID,
          prisma,
        })
      )
    );
    const results = await resultsPromise;
    expect(results.every(({ ok }) => ok)).toBe(true);
    await expect(
      prisma.dailyPlanItem.findMany({
        orderBy: { position: 'asc' },
        where: { planDate: new Date('2026-09-16T00:00:00.000Z'), userId: OWNER_ID },
      })
    ).resolves.toEqual([
      expect.objectContaining({ position: 0, taskId: expect.any(String) }),
      expect.objectContaining({ position: 1, taskId: expect.any(String) }),
    ]);
    await expect(
      prisma.dailyPlanItem.count({ where: { planDate: new Date('2026-09-16T00:00:00.000Z'), userId: OWNER_ID } })
    ).resolves.toBe(2);
  });

  it('serializes opposite-direction cross-date moves without losing either membership', async () => {
    const firstTaskId = '20000000-0000-4000-8000-000000000108';
    const secondTaskId = '20000000-0000-4000-8000-000000000109';
    await Promise.all([createTask(firstTaskId), createTask(secondTaskId)]);
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          planDate: new Date('2026-09-14T00:00:00.000Z'),
          plannedMinutes: 25,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: firstTaskId,
          userId: OWNER_ID,
        },
        {
          planDate: PLAN_DATE,
          plannedMinutes: 35,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: secondTaskId,
          userId: OWNER_ID,
        },
      ],
    });

    const overlap = serializedOverlap();
    const resultsPromise = Promise.all([
      mutateTodayForOwner({
        ...overlap.first,
        input: { planDate: '2026-09-14', targetPlanDate: '2026-09-15', taskId: firstTaskId, type: 'MOVE_TO_DATE' },
        ownerId: OWNER_ID,
        prisma,
      }),
      mutateTodayForOwner({
        ...overlap.second,
        input: { planDate: '2026-09-15', targetPlanDate: '2026-09-14', taskId: secondTaskId, type: 'MOVE_TO_DATE' },
        ownerId: OWNER_ID,
        prisma,
      }),
    ]);
    const results = await resultsPromise;
    expect(results.every(({ ok }) => ok)).toBe(true);
    await expect(
      prisma.dailyPlanItem.findMany({
        orderBy: [{ planDate: 'asc' }, { position: 'asc' }],
        where: { userId: OWNER_ID, taskId: { in: [firstTaskId, secondTaskId] } },
      })
    ).resolves.toEqual([
      expect.objectContaining({ planDate: new Date('2026-09-14T00:00:00.000Z'), position: 0, taskId: secondTaskId }),
      expect.objectContaining({ planDate: PLAN_DATE, position: 0, taskId: firstTaskId }),
    ]);
    await expect(
      prisma.dailyPlanItem.count({ where: { userId: OWNER_ID, taskId: { in: [firstTaskId, secondTaskId] } } })
    ).resolves.toBe(2);
  });

  it('does not disclose a task owned by another user', async () => {
    const taskId = '20000000-0000-4000-8000-000000000099';
    await createTask(taskId, OTHER_OWNER_ID, OTHER_PROJECT_ID);

    await expect(
      mutateTodayForOwner({ input: { planDate: '2026-09-15', taskId, type: 'ADD' }, ownerId: OWNER_ID, prisma })
    ).resolves.toMatchObject({ error: { code: 'NOT_FOUND' }, ok: false });
  });
});

describe('Today inline create-and-plan', () => {
  it('validates a client request id, selected project, title, and planned minutes', () => {
    expect(
      createTodayTaskInputSchema.safeParse({
        planDate: '2026-09-15',
        projectId: PROJECT_A_ID,
        requestId: '30000000-0000-4000-8000-000000000031',
        startNow: false,
        title: '  Plan this  ',
      }).success
    ).toBe(true);
    expect(
      createTodayTaskInputSchema.safeParse({
        planDate: '2026-09-15',
        projectId: PROJECT_A_ID,
        requestId: 'not-a-uuid',
        title: 'Task',
      }).success
    ).toBe(false);
    expect(
      createTodayTaskInputSchema.safeParse({
        planDate: '2026-09-15',
        projectId: PROJECT_A_ID,
        requestId: '30000000-0000-4000-8000-000000000032',
        title: '   ',
      }).success
    ).toBe(false);
    expect(
      createTodayTaskInputSchema.safeParse({
        planDate: '2026-09-15',
        plannedMinutes: 1441,
        projectId: PROJECT_A_ID,
        requestId: '30000000-0000-4000-8000-000000000037',
        title: 'Task',
      }).success
    ).toBe(false);
    expect(
      createTodayTaskInputSchema.safeParse({
        planDate: '2026-09-15',
        projectId: PROJECT_A_ID,
        requestId: '30000000-0000-4000-8000-000000000038',
        title: 'x'.repeat(201),
      }).success
    ).toBe(false);
  });

  it('creates a READY task and appends its selected-date plan in the selected owned project', async () => {
    const firstTaskId = '20000000-0000-4000-8000-000000000131';
    await prisma.task.create({
      data: { id: firstTaskId, projectId: PROJECT_A_ID, title: firstTaskId, userId: OWNER_ID },
    });
    await mutateTodayForOwner({
      input: { planDate: '2026-09-15', taskId: firstTaskId, type: 'ADD' },
      ownerId: OWNER_ID,
      prisma,
    });

    const result = await createTodayTaskForOwner({
      clock: () => NOW,
      input: {
        planDate: '2026-09-15',
        plannedMinutes: 45,
        projectId: PROJECT_B_ID,
        requestId: '30000000-0000-4000-8000-000000000033',
        startNow: false,
        title: '  Inline task  ',
      },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        items: [
          { position: 0, taskId: firstTaskId },
          { plannedMinutes: 45, position: 1, project: { id: PROJECT_B_ID }, title: 'Inline task' },
        ],
        planDate: '2026-09-15',
      },
      ok: true,
    });
    const created = await prisma.task.findFirstOrThrow({ where: { title: 'Inline task', userId: OWNER_ID } });
    expect(created).toMatchObject({ projectId: PROJECT_B_ID, status: 'READY', title: 'Inline task' });
  });

  it.each([
    ['an archived project', ARCHIVED_PROJECT_ID, 'Archived projects cannot receive new tasks'],
    ['another owner project', OTHER_PROJECT_ID, 'Project not found'],
  ])('rejects %s before creating a task', async (_label, projectId, message) => {
    const result = await createTodayTaskForOwner({
      input: {
        planDate: '2026-09-15',
        projectId,
        requestId: '30000000-0000-4000-8000-000000000034',
        startNow: false,
        title: 'Should not exist',
      },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({ error: { code: 'VALIDATION_ERROR', message, retryable: false }, ok: false });
    await expect(prisma.task.count({ where: { title: 'Should not exist' } })).resolves.toBe(0);
  });

  it('starts the new task through the canonical seam and replaces only its selected project session', async () => {
    const existingTaskId = '20000000-0000-4000-8000-000000000132';
    const otherProjectTaskId = '20000000-0000-4000-8000-000000000133';
    await prisma.task.createMany({
      data: [
        { id: existingTaskId, projectId: PROJECT_A_ID, status: 'IN_PROGRESS', title: 'Existing A', userId: OWNER_ID },
        {
          id: otherProjectTaskId,
          projectId: PROJECT_B_ID,
          status: 'IN_PROGRESS',
          title: 'Existing B',
          userId: OWNER_ID,
        },
      ],
    });
    await prisma.workSession.createMany({
      data: [
        {
          projectId: PROJECT_A_ID,
          startedAt: new Date('2026-09-15T10:00:00.000Z'),
          taskId: existingTaskId,
          userId: OWNER_ID,
        },
        {
          projectId: PROJECT_B_ID,
          startedAt: new Date('2026-09-15T11:00:00.000Z'),
          taskId: otherProjectTaskId,
          userId: OWNER_ID,
        },
      ],
    });

    const result = await createTodayTaskForOwner({
      clock: () => NOW,
      input: {
        planDate: '2026-09-15',
        projectId: PROJECT_A_ID,
        requestId: '30000000-0000-4000-8000-000000000039',
        startNow: true,
        title: 'New A focus',
      },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(result).toMatchObject({ data: { focus: { title: 'New A focus' } }, ok: true });
    await expect(prisma.task.findUniqueOrThrow({ where: { id: existingTaskId } })).resolves.toMatchObject({
      status: 'PAUSED',
    });
    await expect(prisma.task.findUniqueOrThrow({ where: { id: otherProjectTaskId } })).resolves.toMatchObject({
      status: 'IN_PROGRESS',
    });
    await expect(prisma.workSession.findFirstOrThrow({ where: { taskId: existingTaskId } })).resolves.toMatchObject({
      endedAt: NOW,
    });
    await expect(prisma.workSession.findFirstOrThrow({ where: { taskId: otherProjectTaskId } })).resolves.toMatchObject(
      { endedAt: null }
    );
  });

  it('replays an identical request from its receipt and rejects a changed payload', async () => {
    const input = {
      planDate: '2026-09-15',
      plannedMinutes: 30,
      projectId: PROJECT_A_ID,
      requestId: '30000000-0000-4000-8000-000000000035',
      startNow: false,
      title: 'Retry me',
    } as const;
    const first = await createTodayTaskForOwner({ clock: () => NOW, input, ownerId: OWNER_ID, prisma });
    const second = await createTodayTaskForOwner({ clock: () => NOW, input, ownerId: OWNER_ID, prisma });
    const changed = await createTodayTaskForOwner({
      clock: () => NOW,
      input: { ...input, title: 'Changed payload' },
      ownerId: OWNER_ID,
      prisma,
    });

    expect(second).toEqual(first);
    expect(changed).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request id was already used with a different payload',
        retryable: false,
      },
      ok: false,
    });
    await expect(prisma.task.count({ where: { userId: OWNER_ID, title: 'Retry me' } })).resolves.toBe(1);
    await expect(
      prisma.todayMutationReceipt.count({ where: { userId: OWNER_ID, requestId: input.requestId } })
    ).resolves.toBe(1);
  });

  it.each([
    { failStage: 'PLAN_CREATED' as const, startNow: false },
    { failStage: 'TRANSITION_APPLIED' as const, startNow: true },
    { failStage: 'RECEIPT_CREATED' as const, startNow: true },
  ])('rolls back every inline-create write after $failStage', async ({ failStage, startNow }) => {
    const existingTaskId = '20000000-0000-4000-8000-000000000140';
    await prisma.task.create({
      data: { id: existingTaskId, projectId: PROJECT_A_ID, status: 'IN_PROGRESS', title: 'Existing focus', userId: OWNER_ID },
    });
    await prisma.workSession.create({
      data: { projectId: PROJECT_A_ID, startedAt: new Date('2026-09-15T10:00:00.000Z'), taskId: existingTaskId, userId: OWNER_ID },
    });
    const beforeTask = await prisma.task.findUniqueOrThrow({ where: { id: existingTaskId } });
    const beforeSession = await prisma.workSession.findFirstOrThrow({ where: { taskId: existingTaskId } });
    await expect(
      createTodayTaskForOwner({
        afterStage: async (stage) => {
          if (stage === failStage) throw new Error(`injected rollback after ${failStage}`);
        },
        clock: () => NOW,
        input: {
          planDate: '2026-09-15',
          plannedMinutes: 20,
          projectId: PROJECT_A_ID,
          requestId: '30000000-0000-4000-8000-000000000036',
          startNow,
          title: 'Rollback me',
        },
        ownerId: OWNER_ID,
        prisma,
      })
    ).rejects.toThrow(`injected rollback after ${failStage}`);
    await expect(prisma.task.count({ where: { title: 'Rollback me' } })).resolves.toBe(0);
    await expect(prisma.dailyPlanItem.count({ where: { userId: OWNER_ID } })).resolves.toBe(0);
    await expect(prisma.todayMutationReceipt.count({ where: { userId: OWNER_ID } })).resolves.toBe(0);
    await expect(prisma.task.findUniqueOrThrow({ where: { id: existingTaskId } })).resolves.toEqual(beforeTask);
    await expect(prisma.workSession.findFirstOrThrow({ where: { taskId: existingTaskId } })).resolves.toEqual(
      beforeSession
    );
  });
});
