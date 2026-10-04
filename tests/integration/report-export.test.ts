import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { PrismaPg } from '@prisma/adapter-pg';
import ExcelJS from 'exceljs';
import { Client } from 'pg';

import { PrismaClient } from '../../generated/prisma/client';
import { GET } from '../../src/app/reports/export/route';
import { validateUserToken } from '../../src/helpers/validate-user';
import { getTestDatabaseUrl } from '../helpers/database';

let mockPrisma: PrismaClient;
jest.mock('../../src/lib/db', () => ({
  __esModule: true,
  default: new Proxy({}, { get: (_target, key) => Reflect.get(mockPrisma, key) }),
}));
jest.mock('../../src/helpers/validate-user', () => ({ validateUserToken: jest.fn() }));

const OWNER = '00000000-0000-4000-8000-000000000091';
const OTHER = '00000000-0000-4000-8000-000000000092';
const PROJECT = '10000000-0000-4000-8000-000000000091';
const FOREIGN = '10000000-0000-4000-8000-000000000092';
const TASK = '20000000-0000-4000-8000-000000000091';
const SESSION = '40000000-0000-4000-8000-000000000091';
const query = (projectId: string) =>
  new NextRequest(
    `http://localhost/reports/export?from=2026-09-22&to=2026-09-22&projectId=${projectId}&taskState=ALL&correctionState=ALL`
  );
const quoteIdentifier = (value: string) => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error('Unsafe test schema name');
  return `"${value}"`;
};

let admin: Client;
let schemaName: string;
jest.setTimeout(60_000);

beforeAll(async () => {
  schemaName = `p506_${process.pid}_${Date.now()}`;
  admin = new Client({ connectionString: getTestDatabaseUrl() });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  await admin.query(`SET search_path TO ${quoteIdentifier(schemaName)}`);
  const migrations = await readdir(path.join(process.cwd(), 'prisma', 'migrations'), { withFileTypes: true });
  for (const name of migrations
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    await admin.query(await readFile(path.join(process.cwd(), 'prisma', 'migrations', name, 'migration.sql'), 'utf8'));
  }
  const url = new URL(getTestDatabaseUrl());
  url.searchParams.set('options', `-c search_path=${schemaName}`);
  mockPrisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString() }, { schema: schemaName }),
  });

  await mockPrisma.user.createMany({
    data: [
      { id: OWNER, email: 'export-owner@example.test', name: 'Owner', password: 'hash', timezone: 'UTC' },
      { id: OTHER, email: 'export-other@example.test', name: 'Other', password: 'hash', timezone: 'UTC' },
    ],
  });
  await mockPrisma.project.createMany({
    data: [
      { id: PROJECT, name: 'Owner project', ownerId: OWNER },
      { id: FOREIGN, name: 'Foreign private project', ownerId: OTHER },
    ],
  });
  await mockPrisma.task.create({
    data: { id: TASK, projectId: PROJECT, userId: OWNER, title: 'Owner task', status: 'PAUSED' },
  });
  await mockPrisma.workSession.create({
    data: {
      id: SESSION,
      taskId: TASK,
      projectId: PROJECT,
      userId: OWNER,
      startedAt: new Date('2026-09-22T10:00:00Z'),
      endedAt: new Date('2026-09-22T10:30:00Z'),
    },
  });
});

afterAll(async () => {
  await mockPrisma?.$disconnect();
  if (admin) {
    await admin.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
    await admin.end();
  }
});

it('rejects a foreign project and downloads only the owner-scoped rows for an owned project', async () => {
  jest.mocked(validateUserToken).mockResolvedValue({ id: OWNER });
  const foreign = await GET(query(FOREIGN));
  expect(foreign.status).toBe(404);
  expect(foreign.headers.get('content-disposition')).toBeNull();
  expect(await foreign.text()).not.toContain('Foreign private project');

  const response = await GET(query(PROJECT));
  expect(response.status).toBe(200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    Buffer.from(await response.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0]
  );
  expect(workbook.getWorksheet('Tasks')!.getRow(2).getCell(1).value).toBe(TASK);
  expect(workbook.getWorksheet('Sessions')!.getRow(2).getCell(1).value).toBe(SESSION);
  expect(
    workbook
      .getWorksheet('Scope')!
      .getRows(1, workbook.getWorksheet('Scope')!.rowCount)!
      .some((row) => row.getCell(1).value === 'Tracked task seconds' && row.getCell(2).value === 1800)
  ).toBe(true);
});
