import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient, type TaskStatus } from '../../generated/prisma/client';
import { mutateProjectWorkspaceLifecycleForOwner } from '../../src/server/projects/mutate-project-workspace';
import type { TaskTransitionEvent } from '../../src/server/tasks/task-transition-types';
import {
  isTransitionSerializationError,
  reconcileTaskTransition,
  runTodayTransitionWithRetry,
  runTransitionWithRetry,
  transitionTask,
  transitionTodayTaskForOwner,
} from '../../src/server/tasks/transition-task';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const USER_A_ID = '00000000-0000-4000-8000-000000000001';
const USER_B_ID = '00000000-0000-4000-8000-000000000002';
const PROJECT_A_ID = '10000000-0000-4000-8000-000000000001';
const PROJECT_B_ID = '10000000-0000-4000-8000-000000000002';
const PROJECT_C_ID = '10000000-0000-4000-8000-000000000003';
const TASK_ID = '20000000-0000-4000-8000-000000000001';
const SECOND_TASK_ID = '20000000-0000-4000-8000-000000000002';
const NOW = new Date('2026-09-13T10:00:00.000Z');
const STARTED_AT = new Date('2026-09-13T09:00:00.000Z');

let admin: Client;
let prisma: PrismaClient;
let schemaName: string;

jest.setTimeout(60_000);

const quoteIdentifier = (value: string): string => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
};

const twoCallBarrier = () => {
  let arrivals = 0;
  let release!: () => void;
  let ready!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const bothArrived = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const enter = async (): Promise<void> => {
    arrivals += 1;
    if (arrivals === 2) ready();
    await released;
  };
  return { bothArrived, enter, release };
};

const migrateSchema = async (): Promise<void> => {
  const entries = await readdir(MIGRATIONS_ROOT, { withFileTypes: true });
  const migrationNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migrationName of migrationNames) {
    const sql = await readFile(path.join(MIGRATIONS_ROOT, migrationName, 'migration.sql'), 'utf8');
    await admin.query(sql);
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
      { email: 'owner-a@example.test', id: USER_A_ID, name: 'Owner A', password: 'hash' },
      { email: 'owner-b@example.test', id: USER_B_ID, name: 'Owner B', password: 'hash' },
    ],
  });
  await prisma.project.createMany({
    data: [
      { id: PROJECT_A_ID, name: 'Project A', ownerId: USER_A_ID },
      { id: PROJECT_B_ID, name: 'Project B', ownerId: USER_B_ID },
    ],
  });
  await prisma.user.update({
    data: { currentProjectId: PROJECT_A_ID },
    where: { id: USER_A_ID },
  });
  await prisma.user.update({
    data: { currentProjectId: PROJECT_B_ID },
    where: { id: USER_B_ID },
  });
};

const seedTaskState = async (status: TaskStatus, ownerId = USER_A_ID): Promise<void> => {
  const projectId = ownerId === USER_A_ID ? PROJECT_A_ID : PROJECT_B_ID;
  await prisma.task.create({
    data: { id: TASK_ID, projectId, status, title: `${status} task`, userId: ownerId },
  });

  if (status === 'PAUSED' || status === 'IN_PROGRESS') {
    await prisma.workSession.create({
      data: {
        endedAt: status === 'PAUSED' ? new Date('2026-09-13T09:30:00.000Z') : null,
        id: '30000000-0000-4000-8000-000000000001',
        projectId,
        source: 'TIMER',
        startedAt: STARTED_AT,
        taskId: TASK_ID,
        userId: ownerId,
      },
    });
  }
};

type MatrixCase = {
  event: TaskTransitionEvent;
  expected: TaskStatus | 'INVALID_TRANSITION';
  from: TaskStatus;
};

const matrix: MatrixCase[] = [
  { event: 'START', expected: 'IN_PROGRESS', from: 'READY' },
  { event: 'PAUSE', expected: 'INVALID_TRANSITION', from: 'READY' },
  { event: 'COMPLETE', expected: 'COMPLETED', from: 'READY' },
  { event: 'CANCEL', expected: 'CANCELLED', from: 'READY' },
  { event: 'START', expected: 'IN_PROGRESS', from: 'IN_PROGRESS' },
  { event: 'PAUSE', expected: 'PAUSED', from: 'IN_PROGRESS' },
  { event: 'COMPLETE', expected: 'COMPLETED', from: 'IN_PROGRESS' },
  { event: 'CANCEL', expected: 'CANCELLED', from: 'IN_PROGRESS' },
  { event: 'START', expected: 'IN_PROGRESS', from: 'PAUSED' },
  { event: 'PAUSE', expected: 'PAUSED', from: 'PAUSED' },
  { event: 'COMPLETE', expected: 'COMPLETED', from: 'PAUSED' },
  { event: 'CANCEL', expected: 'CANCELLED', from: 'PAUSED' },
  { event: 'START', expected: 'INVALID_TRANSITION', from: 'COMPLETED' },
  { event: 'PAUSE', expected: 'INVALID_TRANSITION', from: 'COMPLETED' },
  { event: 'COMPLETE', expected: 'COMPLETED', from: 'COMPLETED' },
  { event: 'CANCEL', expected: 'INVALID_TRANSITION', from: 'COMPLETED' },
  { event: 'START', expected: 'INVALID_TRANSITION', from: 'CANCELLED' },
  { event: 'PAUSE', expected: 'INVALID_TRANSITION', from: 'CANCELLED' },
  { event: 'COMPLETE', expected: 'INVALID_TRANSITION', from: 'CANCELLED' },
  { event: 'CANCEL', expected: 'CANCELLED', from: 'CANCELLED' },
];

beforeAll(async () => {
  schemaName = `p103_${process.pid}_${Date.now()}`;
  admin = new Client({ connectionString: getTestDatabaseUrl() });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await admin.query(`SET search_path TO ${quoteIdentifier(schemaName)}`);
  await migrateSchema();

  const connectionUrl = new URL(getTestDatabaseUrl());
  connectionUrl.searchParams.set('options', `-c search_path=${schemaName}`);
  const adapter = new PrismaPg({ connectionString: connectionUrl.toString() }, { schema: schemaName });
  prisma = new PrismaClient({ adapter });
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

describe('owner-scoped task transitions', () => {
  it('returns the full selected-date Today model after a cockpit transition', async () => {
    await seedTaskState('READY');
    await prisma.dailyPlanItem.create({
      data: {
        planDate: new Date('2026-09-13T00:00:00.000Z'),
        plannedMinutes: 45,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId: TASK_ID,
        userId: USER_A_ID,
      },
    });

    const result = await transitionTodayTaskForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-13', transition: { event: 'START', taskId: TASK_ID } },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toMatchObject({
      ok: true,
      data: { items: [{ taskId: TASK_ID, position: 0 }], planDate: '2026-09-13' },
    });
    expect(result.ok && result.data.focus).toMatchObject({
      planItemId: expect.any(String),
      source: 'planned',
      taskId: TASK_ID,
    });
  });

  it('returns a full selected-date canonical conflict when cockpit starts race', async () => {
    await prisma.task.createMany({
      data: [
        { id: TASK_ID, projectId: PROJECT_A_ID, title: 'Cockpit A', userId: USER_A_ID },
        { id: SECOND_TASK_ID, projectId: PROJECT_A_ID, title: 'Cockpit B', userId: USER_A_ID },
      ],
    });
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          planDate: new Date('2026-09-13T00:00:00.000Z'),
          plannedMinutes: 30,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: TASK_ID,
          userId: USER_A_ID,
        },
        {
          planDate: new Date('2026-09-13T00:00:00.000Z'),
          plannedMinutes: 45,
          position: 1,
          projectId: PROJECT_A_ID,
          taskId: SECOND_TASK_ID,
          userId: USER_A_ID,
        },
      ],
    });
    const { bothArrived, enter, release } = twoCallBarrier();
    const resultsPromise = Promise.all(
      [TASK_ID, SECOND_TASK_ID].map((taskId) =>
        transitionTodayTaskForOwner({
          beforeTransaction: enter,
          clock: () => NOW,
          input: { planDate: '2026-09-13', transition: { event: 'START', taskId } },
          ownerId: USER_A_ID,
          prisma,
        })
      )
    );
    await bothArrived;
    release();
    const results = await resultsPromise;
    const winner = results.find((result) => result.ok);
    const conflictResult = results.find((result) => !result.ok);
    expect(winner).toBeDefined();
    expect(conflictResult).toMatchObject({
      canonical: expect.objectContaining({
        focus: expect.objectContaining({ taskId: winner?.ok ? winner.data.focus?.taskId : undefined }),
        items: expect.arrayContaining([
          expect.objectContaining({ taskId: TASK_ID }),
          expect.objectContaining({ taskId: SECOND_TASK_ID }),
        ]),
        planDate: '2026-09-13',
        runningIndicators: expect.arrayContaining([
          expect.objectContaining({ taskId: winner?.ok ? winner.data.focus?.taskId : undefined }),
        ]),
        summary: expect.objectContaining({ openCount: 2, totalCount: 2 }),
      }),
      error: expect.objectContaining({ code: 'CONFLICT', message: expect.any(String), retryable: true }),
      ok: false,
    });
  });

  it('returns selected-date focus, timers, and aggregates after completing one of multiple project tasks', async () => {
    await prisma.project.create({ data: { id: PROJECT_C_ID, name: 'Project C', ownerId: USER_A_ID } });
    await seedTaskState('IN_PROGRESS');
    await prisma.task.create({
      data: {
        id: SECOND_TASK_ID,
        projectId: PROJECT_C_ID,
        status: 'IN_PROGRESS',
        title: 'Other running task',
        userId: USER_A_ID,
      },
    });
    await prisma.workSession.create({
      data: {
        id: '30000000-0000-4000-8000-000000000002',
        projectId: PROJECT_C_ID,
        source: 'TIMER',
        startedAt: new Date('2026-09-13T09:30:00.000Z'),
        taskId: SECOND_TASK_ID,
        userId: USER_A_ID,
      },
    });
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          planDate: new Date('2026-09-13T00:00:00.000Z'),
          plannedMinutes: 45,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: TASK_ID,
          userId: USER_A_ID,
        },
        {
          planDate: new Date('2026-09-13T00:00:00.000Z'),
          plannedMinutes: 60,
          position: 1,
          projectId: PROJECT_C_ID,
          taskId: SECOND_TASK_ID,
          userId: USER_A_ID,
        },
      ],
    });

    const result = await transitionTodayTaskForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-13', transition: { event: 'COMPLETE', taskId: TASK_ID } },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        focus: { planItemId: expect.any(String), source: 'planned', taskId: SECOND_TASK_ID },
        planDate: '2026-09-13',
        runningIndicators: [expect.objectContaining({ taskId: SECOND_TASK_ID })],
        summary: { completedCount: 1, openCount: 1, totalCount: 2 },
      },
      ok: true,
    });
    expect(result.ok && result.data.items.find(({ taskId }) => taskId === TASK_ID)).toMatchObject({
      actualSeconds: 3600,
      outcome: 'COMPLETED',
      status: 'COMPLETED',
    });
    expect(result.ok && result.data.workload).toMatchObject({ actualSeconds: 5400, plannedMinutes: 105 });
    expect(result.ok && result.data.runningIndicators).toEqual([
      expect.objectContaining({
        elapsedSeconds: 1800,
        project: { id: PROJECT_C_ID, name: 'Project C' },
        taskId: SECOND_TASK_ID,
      }),
    ]);
  });

  it('returns the complete selected-date snapshot after replacing the running task', async () => {
    await seedTaskState('IN_PROGRESS');
    await prisma.task.create({
      data: { id: SECOND_TASK_ID, projectId: PROJECT_A_ID, status: 'READY', title: 'Replacement', userId: USER_A_ID },
    });
    await prisma.dailyPlanItem.createMany({
      data: [
        {
          planDate: new Date('2026-09-13T00:00:00.000Z'),
          plannedMinutes: 45,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: TASK_ID,
          userId: USER_A_ID,
        },
        {
          planDate: new Date('2026-09-13T00:00:00.000Z'),
          plannedMinutes: 30,
          position: 1,
          projectId: PROJECT_A_ID,
          taskId: SECOND_TASK_ID,
          userId: USER_A_ID,
        },
      ],
    });

    const result = await transitionTodayTaskForOwner({
      clock: () => NOW,
      input: { planDate: '2026-09-13', transition: { event: 'START', taskId: SECOND_TASK_ID } },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        focus: { planItemId: expect.any(String), source: 'planned', taskId: SECOND_TASK_ID },
        items: [
          { actualSeconds: 3600, outcome: 'OPEN', status: 'PAUSED', taskId: TASK_ID },
          { actualSeconds: 0, outcome: 'OPEN', plannedMinutes: 30, status: 'IN_PROGRESS', taskId: SECOND_TASK_ID },
        ],
        planDate: '2026-09-13',
        runningIndicators: [
          expect.objectContaining({ project: { id: PROJECT_A_ID, name: 'Project A' }, taskId: SECOND_TASK_ID }),
        ],
        workload: { actualSeconds: 3600, plannedMinutes: 75 },
      },
      ok: true,
    });
    expect(await prisma.workSession.count({ where: { endedAt: null, userId: USER_A_ID } })).toBe(1);
  });

  it.each([
    { event: 'PAUSE' as const, expectedStatus: 'PAUSED' as const, expectedOutcome: 'OPEN' as const },
    { event: 'CANCEL' as const, expectedStatus: 'CANCELLED' as const, expectedOutcome: 'CANCELLED' as const },
  ])(
    'returns the full selected-date snapshot for wrapper $event',
    async ({ event, expectedOutcome, expectedStatus }) => {
      await seedTaskState('IN_PROGRESS');
      await prisma.dailyPlanItem.create({
        data: {
          planDate: new Date('2026-09-13T00:00:00.000Z'),
          plannedMinutes: 45,
          position: 0,
          projectId: PROJECT_A_ID,
          taskId: TASK_ID,
          userId: USER_A_ID,
        },
      });

      const result = await transitionTodayTaskForOwner({
        clock: () => NOW,
        input: { planDate: '2026-09-13', transition: { event, taskId: TASK_ID } },
        ownerId: USER_A_ID,
        prisma,
      });

      expect(result).toMatchObject({
        data: {
          items: [{ actualSeconds: 3600, outcome: expectedOutcome, status: expectedStatus, taskId: TASK_ID }],
          planDate: '2026-09-13',
          runningIndicators: [],
          summary: {
            actualSeconds: 3600,
            cancelledCount: event === 'CANCEL' ? 1 : 0,
            completedCount: 0,
            openCount: event === 'PAUSE' ? 1 : 0,
            totalCount: 1,
          },
        },
        ok: true,
      });
      expect(result.ok && result.data.focus?.taskId).toBe(event === 'PAUSE' ? TASK_ID : undefined);
    }
  );

  it('rolls back cockpit task, session, log, and Today effects after a post-effect failure', async () => {
    await seedTaskState('READY');
    await prisma.dailyPlanItem.create({
      data: {
        planDate: new Date('2026-09-13T00:00:00.000Z'),
        plannedMinutes: 45,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId: TASK_ID,
        userId: USER_A_ID,
      },
    });
    const before = await Promise.all([
      prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } }),
      prisma.workSession.findMany({ where: { taskId: TASK_ID } }),
      prisma.workLogEntry.findMany({ where: { taskId: TASK_ID } }),
      prisma.dailyPlanItem.findMany({ where: { taskId: TASK_ID } }),
    ]);
    const failingPrisma = prisma.$extends({
      query: {
        workLogEntry: {
          async create({ args, query }: any) {
            await query(args);
            throw new Error('injected cockpit rollback');
          },
        },
      },
    });

    await expect(
      transitionTodayTaskForOwner({
        clock: () => NOW,
        input: {
          planDate: '2026-09-13',
          transition: { event: 'START', progressNote: 'started', taskId: TASK_ID },
        },
        ownerId: USER_A_ID,
        prisma: failingPrisma as unknown as PrismaClient,
      })
    ).rejects.toThrow('injected cockpit rollback');
    await expect(
      Promise.all([
        prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } }),
        prisma.workSession.findMany({ where: { taskId: TASK_ID } }),
        prisma.workLogEntry.findMany({ where: { taskId: TASK_ID } }),
        prisma.dailyPlanItem.findMany({ where: { taskId: TASK_ID } }),
      ])
    ).resolves.toEqual(before);
  });

  it.each(matrix)('$from + $event -> $expected', async ({ event, expected, from }) => {
    await seedTaskState(from);

    const result = await transitionTask({
      clock: () => NOW,
      input: { event, taskId: TASK_ID },
      ownerId: USER_A_ID,
      prisma,
    });

    const storedTask = await prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } });
    const sessions = await prisma.workSession.findMany({
      orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
      where: { taskId: TASK_ID },
    });

    if (expected === 'INVALID_TRANSITION') {
      expect(result).toMatchObject({ error: { code: 'INVALID_TRANSITION' }, ok: false });
      expect(storedTask.status).toBe(from);
      return;
    }

    expect(result).toMatchObject({ data: { task: { id: TASK_ID, status: expected } }, ok: true });
    expect(storedTask.status).toBe(expected);

    const openSessions = sessions.filter(({ endedAt }) => endedAt === null);
    if (expected === 'IN_PROGRESS') {
      expect(openSessions).toHaveLength(1);
    } else {
      expect(openSessions).toHaveLength(0);
    }

    if (from === 'IN_PROGRESS' && expected !== 'IN_PROGRESS') {
      expect(sessions[0]?.endedAt).toEqual(NOW);
      expect(storedTask.totalSeconds).toBe(3600);
    }
  });

  it('does not disclose or mutate another owner task, session, project, next step, or work log', async () => {
    await seedTaskState('IN_PROGRESS', USER_B_ID);
    await prisma.task.update({ data: { currentNextStep: '<p>Private next step</p>' }, where: { id: TASK_ID } });
    await prisma.workLogEntry.create({
      data: {
        content: '<p>Private work log</p>',
        id: '50000000-0000-4000-8000-000000000001',
        kind: 'NOTE',
        projectId: PROJECT_B_ID,
        taskId: TASK_ID,
        userId: USER_B_ID,
      },
    });
    const before = await Promise.all([
      prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } }),
      prisma.workSession.findFirstOrThrow({ where: { taskId: TASK_ID } }),
      prisma.project.findUniqueOrThrow({ where: { id: PROJECT_B_ID } }),
      prisma.workLogEntry.findFirstOrThrow({ where: { taskId: TASK_ID } }),
    ]);

    const result = await transitionTask({
      clock: () => NOW,
      input: { event: 'START', taskId: TASK_ID },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Task not found',
        retryable: false,
      },
      ok: false,
    });
    await expect(
      Promise.all([
        prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } }),
        prisma.workSession.findFirstOrThrow({ where: { taskId: TASK_ID } }),
        prisma.project.findUniqueOrThrow({ where: { id: PROJECT_B_ID } }),
        prisma.workLogEntry.findFirstOrThrow({ where: { taskId: TASK_ID } }),
      ])
    ).resolves.toEqual(before);
  });

  it.each([
    { event: 'COMPLETE' as const, outcome: 'COMPLETED' as const },
    { event: 'CANCEL' as const, outcome: 'CANCELLED' as const },
  ])('resolves a planned task as $outcome and returns its Today snapshot', async ({ event, outcome }) => {
    await seedTaskState('IN_PROGRESS');
    await prisma.dailyPlanItem.create({
      data: {
        id: '40000000-0000-4000-8000-000000000001',
        planDate: new Date('2026-09-13T00:00:00.000Z'),
        plannedMinutes: 45,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId: TASK_ID,
        userId: USER_A_ID,
      },
    });

    const result = await transitionTask({
      clock: () => NOW,
      input: {
        completionSummary: event === 'COMPLETE' ? '<p>Shipped</p>' : undefined,
        event,
        nextStep: '<p>Verify</p>',
        progressNote: '<p>Implemented</p>',
        taskId: TASK_ID,
      },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        task: { currentNextStep: '<p>Verify</p>', status: outcome },
        today: {
          completedCount: outcome === 'COMPLETED' ? 1 : 0,
          openCount: 0,
          planDate: '2026-09-13',
          plannedMinutes: 45,
        },
      },
      ok: true,
    });
    await expect(
      prisma.dailyPlanItem.findUniqueOrThrow({
        where: {
          userId_taskId_planDate: {
            planDate: new Date('2026-09-13T00:00:00.000Z'),
            taskId: TASK_ID,
            userId: USER_A_ID,
          },
        },
      })
    ).resolves.toMatchObject({ outcome });
    await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(event === 'COMPLETE' ? 2 : 1);
  });

  it.each(['COMPLETE', 'CANCEL'] as const)('returns a null Today snapshot for an unplanned %s', async (event) => {
    await seedTaskState('READY');

    const result = await transitionTask({
      clock: () => NOW,
      input: { event, taskId: TASK_ID },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toMatchObject({ data: { today: null }, ok: true });
  });

  it.each(['COMPLETE', 'CANCEL'] as const)(
    'does not duplicate sessions or work-log entries on repeated %s requests',
    async (event) => {
      await seedTaskState('READY');
      const input = {
        completionSummary: event === 'COMPLETE' ? '<p>Done once</p>' : undefined,
        event,
        progressNote: '<p>Progress once</p>',
        taskId: TASK_ID,
      };

      const first = await transitionTask({ clock: () => NOW, input, ownerId: USER_A_ID, prisma });
      const second = await transitionTask({ clock: () => NOW, input, ownerId: USER_A_ID, prisma });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      await expect(prisma.workLogEntry.count({ where: { taskId: TASK_ID } })).resolves.toBe(
        event === 'COMPLETE' ? 2 : 1
      );
      await expect(prisma.workSession.count({ where: { taskId: TASK_ID } })).resolves.toBe(0);
    }
  );

  it.each([
    { event: 'START' as const, from: 'READY' as const, openSessions: 1, status: 'IN_PROGRESS' as const },
    { event: 'PAUSE' as const, from: 'IN_PROGRESS' as const, openSessions: 0, status: 'PAUSED' as const },
  ])('keeps repeated $event requests canonical', async ({ event, from, openSessions, status }) => {
    await seedTaskState(from);
    const input = { event, taskId: TASK_ID };

    const first = await transitionTask({ clock: () => NOW, input, ownerId: USER_A_ID, prisma });
    const second = await transitionTask({ clock: () => NOW, input, ownerId: USER_A_ID, prisma });

    expect(first).toMatchObject({ data: { task: { status } }, ok: true });
    expect(second).toMatchObject({ data: { task: { status } }, ok: true });
    await expect(prisma.workSession.count({ where: { endedAt: null, taskId: TASK_ID } })).resolves.toBe(openSessions);
    await expect(prisma.task.findUniqueOrThrow({ where: { id: TASK_ID } })).resolves.toMatchObject({
      totalSeconds: event === 'PAUSE' ? 3600 : 0,
    });
  });

  it('repairs IN_PROGRESS plus START when the open session is missing', async () => {
    await seedTaskState('READY');
    await prisma.task.update({ data: { status: 'IN_PROGRESS' }, where: { id: TASK_ID } });

    const result = await transitionTask({
      clock: () => NOW,
      input: { event: 'START', taskId: TASK_ID },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toMatchObject({ data: { task: { status: 'IN_PROGRESS' } }, ok: true });
    await expect(prisma.workSession.count({ where: { endedAt: null, taskId: TASK_ID } })).resolves.toBe(1);
  });

  it('repairs PAUSED plus PAUSE by closing a stray session with its fractional duration', async () => {
    await seedTaskState('READY');
    await prisma.task.update({ data: { status: 'PAUSED' }, where: { id: TASK_ID } });
    await prisma.workSession.create({
      data: {
        id: '30000000-0000-4000-8000-000000000001',
        projectId: PROJECT_A_ID,
        source: 'TIMER',
        startedAt: new Date('2026-09-13T08:59:59.500Z'),
        taskId: TASK_ID,
        userId: USER_A_ID,
      },
    });

    const result = await transitionTask({
      clock: () => NOW,
      input: { event: 'PAUSE', taskId: TASK_ID },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toMatchObject({ data: { task: { status: 'PAUSED', totalSeconds: 3600.5 } }, ok: true });
    await expect(prisma.workSession.count({ where: { endedAt: null, taskId: TASK_ID } })).resolves.toBe(0);
  });

  it('hands one project from its running task to the requested task atomically', async () => {
    await prisma.task.createMany({
      data: [
        {
          id: TASK_ID,
          projectId: PROJECT_A_ID,
          status: 'IN_PROGRESS',
          title: 'Running task',
          userId: USER_A_ID,
        },
        {
          id: SECOND_TASK_ID,
          projectId: PROJECT_A_ID,
          status: 'READY',
          title: 'Next task',
          userId: USER_A_ID,
        },
      ],
    });
    await prisma.workSession.create({
      data: {
        id: '30000000-0000-4000-8000-000000000001',
        projectId: PROJECT_A_ID,
        source: 'TIMER',
        startedAt: STARTED_AT,
        taskId: TASK_ID,
        userId: USER_A_ID,
      },
    });

    const result = await transitionTask({
      clock: () => NOW,
      input: { event: 'START', taskId: SECOND_TASK_ID },
      ownerId: USER_A_ID,
      prisma,
    });

    expect(result).toMatchObject({
      data: {
        replacedTask: { id: TASK_ID, status: 'PAUSED', totalSeconds: 3600 },
        task: { id: SECOND_TASK_ID, status: 'IN_PROGRESS' },
      },
      ok: true,
    });
    await expect(prisma.workSession.count({ where: { endedAt: null, projectId: PROJECT_A_ID } })).resolves.toBe(1);
  });

  it('allows one open session in each of two projects owned by the user', async () => {
    await prisma.project.create({ data: { id: PROJECT_C_ID, name: 'Project C', ownerId: USER_A_ID } });
    await prisma.task.createMany({
      data: [
        { id: TASK_ID, projectId: PROJECT_A_ID, title: 'Project A task', userId: USER_A_ID },
        { id: SECOND_TASK_ID, projectId: PROJECT_C_ID, title: 'Project C task', userId: USER_A_ID },
      ],
    });

    const results = await Promise.all([
      transitionTask({
        clock: () => NOW,
        input: { event: 'START', taskId: TASK_ID },
        ownerId: USER_A_ID,
        prisma,
      }),
      transitionTask({
        clock: () => NOW,
        input: { event: 'START', taskId: SECOND_TASK_ID },
        ownerId: USER_A_ID,
        prisma,
      }),
    ]);

    expect(results.every(({ ok }) => ok)).toBe(true);
    await expect(prisma.workSession.count({ where: { endedAt: null, userId: USER_A_ID } })).resolves.toBe(2);
  });

  it('reconciles concurrent starts of the same task to one canonical open session', async () => {
    await seedTaskState('READY');

    const results = await Promise.all([
      transitionTask({ clock: () => NOW, input: { event: 'START', taskId: TASK_ID }, ownerId: USER_A_ID, prisma }),
      transitionTask({ clock: () => NOW, input: { event: 'START', taskId: TASK_ID }, ownerId: USER_A_ID, prisma }),
    ]);

    expect(results.every(({ ok }) => ok)).toBe(true);
    await expect(prisma.workSession.count({ where: { endedAt: null, taskId: TASK_ID } })).resolves.toBe(1);
  });

  it('returns a conflict for the losing concurrent start of a different task', async () => {
    await prisma.task.createMany({
      data: [
        { id: TASK_ID, projectId: PROJECT_A_ID, title: 'Concurrent A', userId: USER_A_ID },
        { id: SECOND_TASK_ID, projectId: PROJECT_A_ID, title: 'Concurrent B', userId: USER_A_ID },
      ],
    });

    const results = await Promise.all([
      transitionTask({ clock: () => NOW, input: { event: 'START', taskId: TASK_ID }, ownerId: USER_A_ID, prisma }),
      transitionTask({
        clock: () => NOW,
        input: { event: 'START', taskId: SECOND_TASK_ID },
        ownerId: USER_A_ID,
        prisma,
      }),
    ]);

    expect(results.filter(({ ok }) => ok)).toHaveLength(1);
    expect(results.filter(({ ok }) => !ok)).toEqual([
      expect.objectContaining({ error: expect.objectContaining({ code: 'CONFLICT' }), ok: false }),
    ]);
    await expect(prisma.workSession.count({ where: { endedAt: null, projectId: PROJECT_A_ID } })).resolves.toBe(1);
  });

  it('reads P2002 reconciliation under the project lock and includes the planned Today snapshot', async () => {
    await seedTaskState('IN_PROGRESS');
    await prisma.task.create({
      data: { id: SECOND_TASK_ID, projectId: PROJECT_A_ID, title: 'Different task', userId: USER_A_ID },
    });
    await prisma.dailyPlanItem.create({
      data: {
        id: '40000000-0000-4000-8000-000000000001',
        planDate: new Date('2026-09-13T00:00:00.000Z'),
        plannedMinutes: 45,
        position: 0,
        projectId: PROJECT_A_ID,
        taskId: TASK_ID,
        userId: USER_A_ID,
      },
    });

    let releaseLock!: () => void;
    let reportLocked!: () => void;
    const lockReleased = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const projectLocked = new Promise<void>((resolve) => {
      reportLocked = resolve;
    });
    const lock = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${PROJECT_A_ID} FOR UPDATE`;
      reportLocked();
      await lockReleased;
    });
    await projectLocked;

    const identical = reconcileTaskTransition({
      clock: () => NOW,
      input: { event: 'START', taskId: TASK_ID },
      ownerId: USER_A_ID,
      prisma,
    });
    let settled = false;
    void identical.finally(() => {
      settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(settled).toBe(false);

    releaseLock();
    await lock;
    await expect(identical).resolves.toMatchObject({
      data: {
        project: { runningTaskId: TASK_ID },
        task: { id: TASK_ID, status: 'IN_PROGRESS' },
        today: { planDate: '2026-09-13', plannedMinutes: 45 },
      },
      ok: true,
    });

    await expect(
      reconcileTaskTransition({
        clock: () => NOW,
        input: { event: 'START', taskId: SECOND_TASK_ID },
        ownerId: USER_A_ID,
        prisma,
      })
    ).resolves.toMatchObject({
      canonical: {
        project: { runningTaskId: TASK_ID },
        task: { id: SECOND_TASK_ID, status: 'READY' },
      },
      error: { code: 'CONFLICT' },
      ok: false,
    });
  });

  it('captures PAUSE time after the project lock when START wins the race', async () => {
    await seedTaskState('READY');
    const startedAt = new Date('2026-09-13T10:00:01.000Z');
    const afterStart = new Date('2026-09-13T10:00:02.000Z');
    let observedNow = new Date('2026-09-13T10:00:00.000Z');
    const clock = jest.fn(() => observedNow);

    let releaseStart!: () => void;
    let reportLocked!: () => void;
    const startReleased = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
    const projectLocked = new Promise<void>((resolve) => {
      reportLocked = resolve;
    });
    const winningStart = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${PROJECT_A_ID} FOR UPDATE`;
      await tx.$executeRaw`UPDATE "Project" SET "updatedAt" = "updatedAt" WHERE "id" = ${PROJECT_A_ID}`;
      reportLocked();
      await startReleased;
      await tx.workSession.create({
        data: {
          id: '30000000-0000-4000-8000-000000000001',
          projectId: PROJECT_A_ID,
          source: 'TIMER',
          startedAt,
          taskId: TASK_ID,
          userId: USER_A_ID,
        },
      });
      await tx.task.update({ data: { status: 'IN_PROGRESS' }, where: { id: TASK_ID } });
    });
    await projectLocked;

    const pause = transitionTask({
      clock,
      input: { event: 'PAUSE', taskId: TASK_ID },
      ownerId: USER_A_ID,
      prisma,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(clock).not.toHaveBeenCalled();

    observedNow = afterStart;
    releaseStart();
    await winningStart;
    await expect(pause).resolves.toMatchObject({ data: { task: { status: 'PAUSED' } }, ok: true });
    await expect(prisma.workSession.findFirstOrThrow({ where: { taskId: TASK_ID } })).resolves.toMatchObject({
      endedAt: afterStart,
      startedAt,
    });
    expect(clock).toHaveBeenCalledTimes(1);
  });

  it('serializes project archive against task start', async () => {
    await seedTaskState('READY');

    const results = await Promise.all([
      transitionTask({ clock: () => NOW, input: { event: 'START', taskId: TASK_ID }, ownerId: USER_A_ID, prisma }),
      mutateProjectWorkspaceLifecycleForOwner({
        mutation: { projectId: PROJECT_A_ID, type: 'ARCHIVE' },
        ownerId: USER_A_ID,
        prisma,
        query: { query: '', state: null, taskId: null },
      }),
    ]);

    expect(results.filter(({ ok }) => ok)).toHaveLength(1);
    const [project, openSessions] = await Promise.all([
      prisma.project.findUniqueOrThrow({ where: { id: PROJECT_A_ID } }),
      prisma.workSession.count({ where: { endedAt: null, projectId: PROJECT_A_ID } }),
    ]);
    expect(project.archived && openSessions > 0).toBe(false);
  });
});

describe('transition conflict retry policy', () => {
  it.each(['P2034', '40001', '40P01'])('classifies %s as a serialization/deadlock failure', (code) => {
    expect(isTransitionSerializationError({ code })).toBe(true);
  });

  it('classifies adapter metadata serialization codes', () => {
    expect(
      isTransitionSerializationError({
        code: 'P2028',
        meta: { driverAdapterError: { cause: { originalCode: '40P01' } } },
      })
    ).toBe(true);
    expect(isTransitionSerializationError({ code: 'P2028', meta: { code: '40001' } })).toBe(true);
  });

  it('reconciles cockpit serialization after bounded retry exhaustion with canonical state', async () => {
    const canonical = {
      canonical: { planDate: '2026-09-13' },
      error: { code: 'CONFLICT' as const, message: 'retry', retryable: true },
      ok: false as const,
    };
    const execute = jest.fn().mockRejectedValue({ code: '40P01' });
    const reconcile = jest.fn().mockResolvedValue(canonical);

    await expect(runTodayTransitionWithRetry({ execute, reconcile })).resolves.toBe(canonical);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it.each(['P2034', '40001'])('retries one %s and returns a retryable conflict after exhaustion', async (code) => {
    const execute = jest.fn().mockRejectedValue({ code });
    const reconcile = jest.fn();

    const result = await runTransitionWithRetry({ execute, reconcile });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(reconcile).not.toHaveBeenCalled();
    expect(result).toMatchObject({ error: { code: 'CONFLICT', retryable: true }, ok: false });
  });

  it.each(['P2002', '23505'])('reconciles %s exactly once without retrying the write', async (code) => {
    const canonical = { data: { marker: 'canonical' }, ok: true } as const;
    const execute = jest.fn().mockRejectedValue({ code });
    const reconcile = jest.fn().mockResolvedValue(canonical);

    await expect(runTransitionWithRetry({ execute, reconcile })).resolves.toBe(canonical);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });
});
