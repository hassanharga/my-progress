import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient, type Prisma } from '../../generated/prisma/client';
import { createUser } from '../../src/actions/user';
import { verifyPassword } from '../../src/lib/hash';
import { updateAccountPreferencesForOwner } from '../../src/server/account/account-preferences';
import { getTestDatabaseUrl } from '../helpers/database';

const OWNER = '00000000-0000-4000-8000-000000000061';
const OTHER = '00000000-0000-4000-8000-000000000062';
const PROJECT = '10000000-0000-4000-8000-000000000061';
const TASK = '20000000-0000-4000-8000-000000000061';
let admin: Client;
let prisma: PrismaClient;
let schemaName: string;
let mockRegistrationPrisma: PrismaClient;
jest.mock('../../src/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (args: Prisma.UserFindUniqueArgs) => mockRegistrationPrisma.user.findUnique(args),
      create: (args: Prisma.UserCreateArgs) => mockRegistrationPrisma.user.create(args),
    },
  },
}));
jest.mock('../../src/utils/cookie', () => ({ setCookie: jest.fn(), getFromCookies: jest.fn() }));
jest.mock('../../src/lib/generate-token', () => ({ generateToken: jest.fn(() => 'test-session-token') }));
jest.mock('../../src/utils/logger', () => ({ logger: { error: jest.fn() } }));
jest.setTimeout(60_000);

const quoteIdentifier = (value: string): string => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error('Unsafe test schema identifier.');
  return `"${value}"`;
};

beforeAll(async () => {
  const databaseUrl = getTestDatabaseUrl();
  schemaName = `p6a01_${process.pid}_${Date.now()}`;
  admin = new Client({ connectionString: databaseUrl });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await admin.query(`SET search_path TO ${quoteIdentifier(schemaName)}`);
  const root = path.join(process.cwd(), 'prisma', 'migrations');
  const migrations = await readdir(root, { withFileTypes: true });
  for (const entry of migrations
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    await admin.query(await readFile(path.join(root, entry, 'migration.sql'), 'utf8'));
  }
  const url = new URL(databaseUrl);
  url.searchParams.set('options', `-c search_path=${schemaName}`);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema: schemaName }) });
  mockRegistrationPrisma = prisma;
  await prisma.user.createMany({
    data: [
      {
        id: OWNER,
        email: 'account-owner@example.test',
        name: 'Owner',
        password: 'hash',
        timezone: 'Africa/Cairo',
        dailyCapacityMinutes: 90,
      },
      { id: OTHER, email: 'account-other@example.test', name: 'Other', password: 'hash' },
    ],
  });
  await prisma.project.create({ data: { id: PROJECT, ownerId: OWNER, name: 'Project' } });
  await prisma.user.update({ where: { id: OWNER }, data: { currentProjectId: PROJECT } });
  await prisma.task.create({ data: { id: TASK, userId: OWNER, projectId: PROJECT, title: 'Historical task' } });
  await prisma.dailyPlanItem.create({
    data: { userId: OWNER, projectId: PROJECT, taskId: TASK, position: 0, planDate: new Date('2026-09-29T00:00:00Z') },
  });
  await prisma.workSession.create({
    data: {
      userId: OWNER,
      projectId: PROJECT,
      taskId: TASK,
      startedAt: new Date('2026-09-29T20:00:00Z'),
      endedAt: new Date('2026-09-29T21:00:00Z'),
    },
  });
});

it('signup creates an identified account with a hashed password and returns only safe fields', async () => {
  const input = {
    name: 'Registration fixture',
    email: 'registration@example.test',
    password: 'synthetic-test-password-123',
    confirmPassword: 'synthetic-test-password-123',
  };
  const result = await createUser(input);
  expect(result?.serverError).toBeUndefined();
  expect(result?.data?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  const saved = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
  expect(saved.id).toBe(result?.data?.id);
  expect(saved.password).not.toBe(input.password);
  expect(await verifyPassword(saved.password, input.password)).toBe(true);
  expect(result?.data).not.toHaveProperty('password');
  expect(result?.data).not.toHaveProperty('token');
  expect((await createUser(input))?.serverError).toBe('An account with this email already exists.');
  expect(await prisma.user.count({ where: { email: input.email } })).toBe(1);
});

afterAll(async () => {
  await prisma?.$disconnect();
  if (admin) {
    if (schemaName) await admin.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
    await admin.end();
  }
});

it('patches only the authenticated owner and never rewrites historical dates or sessions', async () => {
  const foreignBefore = await prisma.user.findUniqueOrThrow({ where: { id: OTHER } });
  const plansBefore = await prisma.dailyPlanItem.findMany();
  const sessionsBefore = await prisma.workSession.findMany();
  const tasksBefore = await prisma.task.findMany();
  const input = { weekStartDay: 'SATURDAY' as const, ownerId: OTHER };
  const result = await updateAccountPreferencesForOwner({ prisma, ownerId: OWNER, input });
  expect(result).toMatchObject({
    id: OWNER,
    weekStartDay: 'SATURDAY',
    timezone: 'Africa/Cairo',
    dailyCapacityMinutes: 90,
  });
  expect(result).not.toHaveProperty('password');
  expect(await prisma.user.findUniqueOrThrow({ where: { id: OTHER } })).toEqual(foreignBefore);
  const before = await prisma.user.findUniqueOrThrow({ where: { id: OWNER } });
  const changed = await updateAccountPreferencesForOwner({
    prisma,
    ownerId: OWNER,
    input: { timezone: 'Pacific/Honolulu', dailyCapacityMinutes: 0 },
  });
  expect(changed.dailyCapacityMinutes).toBe(0);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: OWNER } })).todayRevision).toBe(before.todayRevision + 1);
  await updateAccountPreferencesForOwner({ prisma, ownerId: OWNER, input: { timezone: 'Pacific/Honolulu' } });
  expect((await prisma.user.findUniqueOrThrow({ where: { id: OWNER } })).todayRevision).toBe(before.todayRevision + 1);
  await expect(
    updateAccountPreferencesForOwner({ prisma, ownerId: 'missing-owner', input: { timezone: 'UTC' } })
  ).rejects.toThrow('Account unavailable.');
  await expect(
    updateAccountPreferencesForOwner({ prisma, ownerId: OWNER, input: { dailyCapacityMinutes: -1 } })
  ).rejects.toThrow();
  expect(await prisma.dailyPlanItem.findMany()).toEqual(plansBefore);
  expect(await prisma.workSession.findMany()).toEqual(sessionsBefore);
  expect(await prisma.task.findMany()).toEqual(tasksBefore);
});

it('rolls back preferences and revision if the transaction fails after its write', async () => {
  const before = await prisma.user.findUniqueOrThrow({ where: { id: OWNER } });
  const failing = prisma.$extends({
    query: {
      user: {
        async update({ args, query }) {
          await query(args);
          throw new Error('Injected post-write failure');
        },
      },
    },
  });
  await expect(
    updateAccountPreferencesForOwner({
      prisma: failing as unknown as PrismaClient,
      ownerId: OWNER,
      input: { weekStartDay: before.weekStartDay === 'MONDAY' ? 'SUNDAY' : 'MONDAY' },
    })
  ).rejects.toThrow('Injected post-write failure');
  expect(await prisma.user.findUniqueOrThrow({ where: { id: OWNER } })).toEqual(before);
});
