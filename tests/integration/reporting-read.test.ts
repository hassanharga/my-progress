import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import type { ReportingQuery } from '../../src/schema/reporting';
import { readReportingForOwner } from '../../src/server/reporting/read-reporting';
import { getTestDatabaseUrl } from '../helpers/database';

const MIGRATIONS_ROOT = path.join(process.cwd(), 'prisma', 'migrations');
const OWNER = '00000000-0000-4000-8000-000000000081';
const OTHER = '00000000-0000-4000-8000-000000000082';
const PROJECT = '10000000-0000-4000-8000-000000000081';
const SECOND = '10000000-0000-4000-8000-000000000082';
const FOREIGN = '10000000-0000-4000-8000-000000000083';
const PLANNED = '20000000-0000-4000-8000-000000000081';
const WORKED = '20000000-0000-4000-8000-000000000082';
const CREATED_ONLY = '20000000-0000-4000-8000-000000000083';
const PARALLEL = '20000000-0000-4000-8000-000000000084';
const FOREIGN_TASK = '20000000-0000-4000-8000-000000000085';
const NOW = new Date('2026-09-23T01:00:00.000Z');
const query: ReportingQuery = {
  from: '2026-09-22',
  to: '2026-09-22',
  projectId: null,
  taskState: 'ALL',
  correctionState: 'ALL',
  page: 1,
};

let admin: Client;
let prisma: PrismaClient;
let schemaName: string;

jest.setTimeout(60_000);

const quoteIdentifier = (value: string): string => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
};

beforeAll(async () => {
  schemaName = `p503_${process.pid}_${Date.now()}`;
  admin = new Client({ connectionString: getTestDatabaseUrl() });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await admin.query(`SET search_path TO ${quoteIdentifier(schemaName)}`);
  const migrations = await readdir(MIGRATIONS_ROOT, { withFileTypes: true });
  for (const name of migrations
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    await admin.query(await readFile(path.join(MIGRATIONS_ROOT, name, 'migration.sql'), 'utf8'));
  }
  const url = new URL(getTestDatabaseUrl());
  url.searchParams.set('options', `-c search_path=${schemaName}`);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema: schemaName }) });
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
      { id: OWNER, email: 'report-owner@example.test', name: 'Owner', password: 'hash', timezone: 'America/New_York' },
      { id: OTHER, email: 'report-other@example.test', name: 'Other', password: 'hash' },
    ],
  });
  await prisma.project.createMany({
    data: [
      { id: PROJECT, name: 'Archive', archived: true, ownerId: OWNER },
      { id: SECOND, name: 'Second', ownerId: OWNER },
      { id: FOREIGN, name: 'Foreign', ownerId: OTHER },
    ],
  });
  await prisma.task.createMany({
    data: [
      {
        id: PLANNED,
        projectId: PROJECT,
        userId: OWNER,
        title: 'Planned',
        status: 'RESUMED',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: WORKED,
        projectId: PROJECT,
        userId: OWNER,
        title: 'Worked',
        status: 'COMPLETED',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: CREATED_ONLY,
        projectId: PROJECT,
        userId: OWNER,
        title: 'Created only',
        createdAt: new Date('2026-09-22T12:00:00Z'),
      },
      { id: PARALLEL, projectId: SECOND, userId: OWNER, title: 'Parallel' },
      { id: FOREIGN_TASK, projectId: FOREIGN, userId: OTHER, title: 'Foreign' },
    ],
  });
  await prisma.dailyPlanItem.create({
    data: {
      userId: OWNER,
      projectId: PROJECT,
      taskId: PLANNED,
      planDate: new Date('2026-09-22T00:00:00Z'),
      position: 1,
      plannedMinutes: 30,
    },
  });
  await prisma.workSession.createMany({
    data: [
      {
        id: '40000000-0000-4000-8000-000000000081',
        taskId: WORKED,
        projectId: PROJECT,
        userId: OWNER,
        startedAt: new Date('2026-09-22T03:30:00Z'),
        endedAt: new Date('2026-09-22T05:00:00Z'),
      },
      {
        id: '40000000-0000-4000-8000-000000000082',
        taskId: PLANNED,
        projectId: PROJECT,
        userId: OWNER,
        startedAt: new Date('2026-09-23T03:30:00Z'),
        endedAt: new Date('2026-09-23T05:00:00Z'),
        correctedAt: NOW,
      },
      {
        id: '40000000-0000-4000-8000-000000000083',
        taskId: PARALLEL,
        projectId: SECOND,
        userId: OWNER,
        startedAt: new Date('2026-09-22T04:30:00Z'),
        endedAt: new Date('2026-09-22T05:30:00Z'),
      },
      {
        id: '40000000-0000-4000-8000-000000000084',
        taskId: FOREIGN_TASK,
        projectId: FOREIGN,
        userId: OTHER,
        startedAt: new Date('2026-09-22T04:00:00Z'),
        endedAt: new Date('2026-09-22T05:00:00Z'),
      },
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

describe('owner-scoped reporting read', () => {
  it('returns the same null result for missing and foreign project scopes before reading their rows', async () => {
    await expect(
      readReportingForOwner({ ownerId: OWNER, query: { ...query, projectId: FOREIGN }, prisma, clock: () => NOW })
    ).resolves.toBeNull();
    await expect(
      readReportingForOwner({
        ownerId: OWNER,
        query: { ...query, projectId: '10000000-0000-4000-8000-000000000099' },
        prisma,
        clock: () => NOW,
      })
    ).resolves.toBeNull();
  });

  it('includes archived plans and overlapping work while excluding tasks only created in range', async () => {
    const snapshot = await readReportingForOwner({ ownerId: OWNER, query, prisma, clock: () => NOW });
    expect(snapshot?.ownedProjects).toContainEqual({ id: PROJECT, name: 'Archive', archived: true });
    expect(snapshot?.taskRows.map((row) => row.id)).toEqual([PLANNED, WORKED, PARALLEL]);
    expect(snapshot?.taskRows.find((row) => row.id === PLANNED)).toMatchObject({
      status: 'IN_PROGRESS',
      plannedMinutes: 30,
    });
    expect(snapshot?.sessionRows.map((row) => row.scopedSeconds)).toEqual([3600, 3600]);
    expect(snapshot?.facts).toMatchObject({ trackedSeconds: 7200, uniqueWorkingSeconds: 5400, overlapSeconds: 1800 });
    expect(snapshot?.generatedAt).toEqual(NOW);
  });

  it('applies current task state and correction filters to rows and totals identically', async () => {
    const corrected = await readReportingForOwner({
      ownerId: OWNER,
      query: { ...query, correctionState: 'CORRECTED' },
      prisma,
      clock: () => NOW,
    });
    expect(corrected?.taskRows).toEqual([]);
    expect(corrected?.sessionRows).toEqual([]);
    expect(corrected?.facts.trackedSeconds).toBe(0);

    const afterCorrection = await readReportingForOwner({
      ownerId: OWNER,
      query: { ...query, correctionState: 'CORRECTED' },
      prisma,
      clock: () => new Date('2026-09-23T06:00:00Z'),
    });
    expect(afterCorrection?.taskRows.map((row) => row.id)).toEqual([PLANNED]);
    expect(afterCorrection?.sessionRows.map((row) => row.scopedSeconds)).toEqual([1800]);
    expect(afterCorrection?.facts.trackedSeconds).toBe(1800);

    const uncorrected = await readReportingForOwner({
      ownerId: OWNER,
      query: { ...query, correctionState: 'UNCORRECTED' },
      prisma,
      clock: () => NOW,
    });
    expect(uncorrected?.taskRows.map((row) => row.id)).toEqual([WORKED, PARALLEL]);
    expect(uncorrected?.facts.trackedSeconds).toBe(7200);

    const completed = await readReportingForOwner({
      ownerId: OWNER,
      query: { ...query, taskState: 'COMPLETED' },
      prisma,
      clock: () => NOW,
    });
    expect(completed?.taskRows.map((row) => row.id)).toEqual([WORKED]);
    expect(completed?.sessionRows.map((row) => row.taskId)).toEqual([WORKED]);
    expect(completed?.facts.trackedSeconds).toBe(3600);

    const archivedOnly = await readReportingForOwner({
      ownerId: OWNER,
      query: { ...query, projectId: PROJECT },
      prisma,
      clock: () => NOW,
    });
    expect(archivedOnly?.taskRows.map((row) => row.id)).toEqual([PLANNED, WORKED]);
    expect(archivedOnly?.facts.trackedSeconds).toBe(3600);
  });

  it('captures open-session time once and preserves scope independently of preview page', async () => {
    await prisma.workSession.create({
      data: {
        id: '40000000-0000-4000-8000-000000000086',
        taskId: PLANNED,
        projectId: PROJECT,
        userId: OWNER,
        startedAt: new Date('2026-09-22T23:30:00Z'),
      },
    });
    const earlierNow = new Date('2026-09-23T00:00:00Z');
    const first = await readReportingForOwner({ ownerId: OWNER, query, prisma, clock: () => earlierNow });
    const laterPage = await readReportingForOwner({
      ownerId: OWNER,
      query: { ...query, page: 5 },
      prisma,
      clock: () => earlierNow,
    });
    expect(first?.sessionRows.find((row) => row.id.endsWith('086'))?.scopedSeconds).toBe(1800);
    expect(laterPage?.facts).toEqual(first?.facts);
    expect(laterPage?.taskRows).toEqual(first?.taskRows);
  });
});
