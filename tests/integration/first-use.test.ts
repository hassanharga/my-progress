import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import { createFirstProjectForOwner } from '../../src/server/account/create-first-project';
import { readFirstUseForOwner } from '../../src/server/account/read-first-use';
import { saveFirstUseTimezoneForOwner } from '../../src/server/account/save-first-use-timezone';
import { createTodayTaskForOwner } from '../../src/server/today/mutate-today';
import { getTestDatabaseUrl } from '../helpers/database';

let admin: Client;
let prisma: PrismaClient;
let schemaName: string;
jest.setTimeout(60_000);
const quote = (name: string) => {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Unsafe test schema identifier.');
  return `"${name}"`;
};
beforeAll(async () => {
  const url = getTestDatabaseUrl();
  schemaName = `p6a04_${process.pid}_${Date.now()}`;
  admin = new Client({ connectionString: url });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${quote(schemaName)}`);
  await admin.query(`SET search_path TO ${quote(schemaName)}`);
  const root = path.join(process.cwd(), 'prisma', 'migrations');
  for (const migration of (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    await admin.query(await readFile(path.join(root, migration, 'migration.sql'), 'utf8'));
  }
  const connection = new URL(url);
  connection.searchParams.set('options', `-c search_path=${schemaName}`);
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: connection.toString() }, { schema: schemaName }),
  });
});
afterAll(async () => {
  await prisma?.$disconnect();
  if (admin) {
    if (schemaName) await admin.query(`DROP SCHEMA IF EXISTS ${quote(schemaName)} CASCADE`);
    await admin.end();
  }
});
const owner = async () => {
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      name: 'Owner',
      password: 'test-hash',
      timezone: 'UTC',
      dailyCapacityMinutes: 0,
    },
  });
  return id;
};
it('creates and activates once; identical retry reconciles, changed name and foreign identity never get adopted', async () => {
  const ownerId = await owner();
  const input = { projectId: randomUUID(), name: 'Personal' };
  expect(await readFirstUseForOwner({ prisma, ownerId })).toEqual({
    activeProjectCount: 0,
    archivedProjectCount: 0,
    taskCount: 0,
  });
  expect((await createFirstProjectForOwner({ prisma, ownerId, input })).ok).toBe(true);
  const before = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
  expect(before.currentProjectId).toBe(input.projectId);
  expect((await createFirstProjectForOwner({ prisma, ownerId, input })).ok).toBe(true);
  expect(await prisma.project.count({ where: { ownerId } })).toBe(1);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).todayRevision).toBe(before.todayRevision);
  expect(await createFirstProjectForOwner({ prisma, ownerId, input: { ...input, name: 'Changed' } })).toMatchObject({
    ok: false,
    error: { retryable: false },
  });
  const foreign = await owner();
  const result = await createFirstProjectForOwner({ prisma, ownerId: foreign, input });
  expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND', retryable: false } });
  expect(result).not.toHaveProperty('canonical');
  expect(await prisma.project.count({ where: { ownerId: foreign } })).toBe(0);
});
it('serializes competing first-project requests into one project and a canonical conflict', async () => {
  const ownerId = await owner();
  const inputs = [
    { projectId: randomUUID(), name: 'First' },
    { projectId: randomUUID(), name: 'Second' },
  ];
  const results = await Promise.all(inputs.map((input) => createFirstProjectForOwner({ prisma, ownerId, input })));
  expect(results.filter((result) => result.ok)).toHaveLength(1);
  expect(await prisma.project.count({ where: { ownerId, archived: false } })).toBe(1);
  const lost = results.findIndex((result) => !result.ok);
  expect(await createFirstProjectForOwner({ prisma, ownerId, input: inputs[lost] })).toMatchObject({
    ok: false,
    canonical: { projectId: expect.any(String) },
    error: { code: 'CONFLICT', retryable: false },
  });
});
it('rolls back project and activation together after an injected post-write failure', async () => {
  const ownerId = await owner();
  const failing = prisma.$extends({
    query: {
      user: {
        async update({ args, query }) {
          await query(args);
          throw new Error('Injected activation failure');
        },
      },
    },
  });
  expect(
    await createFirstProjectForOwner({
      prisma: failing as unknown as PrismaClient,
      ownerId,
      input: { projectId: randomUUID(), name: 'Rollback' },
    })
  ).toMatchObject({ ok: false });
  expect(await prisma.project.count({ where: { ownerId } })).toBe(0);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).currentProjectId).toBeNull();
});
it('uses the newly stored zone near midnight for a new receipt while preserving historical dates and sessions', async () => {
  const ownerId = await owner();
  const projectId = randomUUID();
  await createFirstProjectForOwner({ prisma, ownerId, input: { projectId, name: 'History' } });
  const task = await prisma.task.create({ data: { userId: ownerId, projectId, title: 'Historical' } });
  const historicalPlan = await prisma.dailyPlanItem.create({
    data: { userId: ownerId, projectId, taskId: task.id, position: 0, planDate: new Date('2026-10-02T00:00:00Z') },
  });
  const session = await prisma.workSession.create({
    data: {
      userId: ownerId,
      projectId,
      taskId: task.id,
      startedAt: new Date('2026-10-02T20:00:00Z'),
      endedAt: new Date('2026-10-02T21:00:00Z'),
    },
  });
  // Freeze only Date. PostgreSQL/network timers stay real.
  jest.useFakeTimers({
    now: new Date('2026-10-04T00:30:00Z'),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
  try {
    const saved = await saveFirstUseTimezoneForOwner({ prisma, ownerId, input: { timezone: 'Pacific/Honolulu' } });
    expect(saved).toMatchObject({
      ok: true,
      data: {
        profile: { timezone: 'Pacific/Honolulu', dailyCapacityMinutes: 0 },
        today: { timezone: 'Pacific/Honolulu', planDate: '2026-10-03', workload: { capacityMinutes: 0 } },
      },
    });
    const input = {
      projectId,
      requestId: randomUUID(),
      title: 'New local-day task',
      description: 'Keep scope',
      planDate: '2026-10-03',
      startNow: false,
    };
    expect((await createTodayTaskForOwner({ prisma, ownerId, input })).ok).toBe(true);
    expect((await createTodayTaskForOwner({ prisma, ownerId, input })).ok).toBe(true);
    expect(await prisma.task.count({ where: { userId: ownerId, title: input.title } })).toBe(1);
    expect(await prisma.dailyPlanItem.findUnique({ where: { id: historicalPlan.id } })).toEqual(historicalPlan);
    expect(await prisma.workSession.findUnique({ where: { id: session.id } })).toEqual(session);
    await prisma.project.update({ where: { id: projectId }, data: { archived: true } });
    expect(await readFirstUseForOwner({ prisma, ownerId })).toEqual({
      activeProjectCount: 0,
      archivedProjectCount: 1,
      taskCount: 2,
    });
  } finally {
    jest.useRealTimers();
  }
});
