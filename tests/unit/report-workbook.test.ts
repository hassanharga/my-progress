import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';

import { GET } from '../../src/app/reports/export/route';
import { validateUserToken } from '../../src/helpers/validate-user';
import db from '../../src/lib/db';
import {
  buildReportWorkbook,
  REPORT_WORKBOOK_MAX_ROWS,
  ReportWorkbookTooLargeError,
} from '../../src/server/reporting/build-report-workbook';
import type { ReportingSnapshot } from '../../src/server/reporting/read-reporting';
import { readReportingForOwner } from '../../src/server/reporting/read-reporting';

jest.mock('../../src/helpers/validate-user', () => ({ validateUserToken: jest.fn() }));
jest.mock('../../src/lib/db', () => ({ __esModule: true, default: { user: { findUnique: jest.fn() } } }));
jest.mock('../../src/server/reporting/read-reporting', () => ({ readReportingForOwner: jest.fn() }));

const snapshot = (): ReportingSnapshot => ({
  query: {
    from: '2026-09-22',
    to: '2026-09-23',
    projectId: 'project-1',
    taskState: 'PAUSED',
    correctionState: 'CORRECTED',
    page: 4,
  },
  timezone: 'America/New_York',
  weekStartDay: 'MONDAY',
  generatedAt: new Date('2026-09-23T01:00:00Z'),
  ownedProjects: [{ id: 'project-1', name: '=Project', archived: false }],
  facts: {
    plannedMinutes: 30,
    missingEstimateCount: 1,
    plannedTaskSeconds: 1800,
    missingEstimateWorkedSeconds: 0,
    unplannedSeconds: 0,
    trackedSeconds: 2700.5,
    uniqueWorkingSeconds: 2400.5,
    overlapSeconds: 300,
    varianceSeconds: 900.5,
    overrunCount: 0,
    sessionSplitCount: 0,
    daily: [],
    weekly: [],
    projects: [],
  },
  taskRows: [
    {
      id: 'task-1',
      projectId: 'project-1',
      projectName: '=Project',
      title: '\t=SUM(1,1)',
      status: 'PAUSED',
      plannedMinutes: 30,
      missingEstimateCount: 1,
      trackedSeconds: 2700.5,
      sessionCount: 2,
    },
  ],
  sessionRows: [
    {
      id: 'session-1',
      taskId: 'task-1',
      taskTitle: '\t=SUM(1,1)',
      projectId: 'project-1',
      projectName: '=Project',
      startedAt: new Date('2026-09-22T22:00:00Z'),
      endedAt: new Date('2026-09-22T22:30:00Z'),
      correctedAt: new Date('2026-09-23T00:00:00Z'),
      scopedStartedAt: new Date('2026-09-22T22:00:00Z'),
      scopedEndedAt: new Date('2026-09-22T22:30:00Z'),
      scopedSeconds: 1800,
    },
    {
      id: 'session-2',
      taskId: 'task-1',
      taskTitle: '\t=SUM(1,1)',
      projectId: 'project-1',
      projectName: '=Project',
      startedAt: new Date('2026-09-23T00:45:00Z'),
      endedAt: null,
      correctedAt: new Date('2026-09-23T00:50:00Z'),
      scopedStartedAt: new Date('2026-09-23T00:45:00Z'),
      scopedEndedAt: new Date('2026-09-23T01:00:00.500Z'),
      scopedSeconds: 900.5,
    },
  ],
});

describe('report workbook', () => {
  it('exports the full scoped dataset, filters, definitions and exact seconds', () => {
    const workbook = buildReportWorkbook(snapshot());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Scope', 'Tasks', 'Sessions']);
    const scope = workbook.getWorksheet('Scope')!;
    const pairs = Object.fromEntries(
      scope.getRows(2, scope.rowCount - 1)!.map((row) => [row.getCell(1).value, row.getCell(2).value])
    );
    expect(pairs).toMatchObject({
      'From (inclusive local date)': '2026-09-22',
      'To (inclusive local date)': '2026-09-23',
      'Project ID': 'project-1',
      'Current task state': 'PAUSED',
      'Session correction state': 'CORRECTED',
      'Time zone': 'America/New_York',
      'Tracked task seconds': 2700.5,
      'Unique working seconds': 2400.5,
      'Overlapping tracked seconds': 300,
      'Task count': 1,
      'Session count': 2,
    });
    expect(String(pairs['Tracked task time definition'])).toMatch(/matching sessions/i);
    expect(String(pairs['Unique working time definition'])).toMatch(/overlap/i);
    expect(pairs['Captured at (UTC)']).toBe('2026-09-23T01:00:00.000Z');

    const tasks = workbook.getWorksheet('Tasks')!;
    expect(tasks.rowCount).toBe(3);
    expect(tasks.getRow(2).values).toEqual([
      undefined,
      'task-1',
      'project-1',
      "'=Project",
      "'\t=SUM(1,1)",
      'PAUSED',
      30,
      1,
      2700.5,
      2,
    ]);
    expect(tasks.getRow(3).getCell(8).value).toBe(2700.5);
    const sessions = workbook.getWorksheet('Sessions')!;
    expect(sessions.rowCount).toBe(4);
    expect([sessions.getRow(2).getCell(1).value, sessions.getRow(3).getCell(1).value]).toEqual([
      'session-1',
      'session-2',
    ]);
    expect(sessions.getRow(3).getCell(7).value).toBeNull();
    expect(sessions.getRow(3).getCell(12).value).toBe(900.5);
    expect(sessions.getRow(4).getCell(12).value).toBe(2700.5);
  });

  it('rejects an oversized dataset before constructing a workbook', () => {
    const input = snapshot();
    input.taskRows = Array(REPORT_WORKBOOK_MAX_ROWS + 1).fill(input.taskRows[0]);
    expect(() => buildReportWorkbook(input)).toThrow(ReportWorkbookTooLargeError);
  });

  it('retains safe text and all session rows after XLSX serialization', async () => {
    const bytes = await buildReportWorkbook(snapshot()).xlsx.writeBuffer();
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(bytes);
    expect(reopened.getWorksheet('Tasks')!.getRow(2).getCell(4).value).toBe("'\t=SUM(1,1)");
    expect(reopened.getWorksheet('Sessions')!.getRow(3).getCell(1).value).toBe('session-2');
  });
});

describe('report download route', () => {
  const request = (query: string) => new NextRequest(`http://localhost/reports/export?${query}`);
  const valid =
    'from=2026-09-22&to=2026-09-23&projectId=11111111-1111-4111-8111-111111111111&taskState=PAUSED&correctionState=CORRECTED';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(validateUserToken).mockResolvedValue({ id: 'owner-1' });
    jest
      .mocked(db.user.findUnique)
      .mockResolvedValue({ timezone: 'America/New_York' } as Awaited<ReturnType<typeof db.user.findUnique>>);
    jest.mocked(readReportingForOwner).mockResolvedValue(snapshot());
  });

  it('authenticates, validates owner scope and downloads a complete private workbook', async () => {
    const response = await GET(request(`${valid}&page=4`));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="my-progress-report-2026-09-22-to-2026-09-23.xlsx"'
    );
    expect(response.headers.get('content-type')).toContain('spreadsheetml.sheet');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
    expect(readReportingForOwner).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      prisma: db,
      query: { ...snapshot().query, projectId: '11111111-1111-4111-8111-111111111111' },
    });
    expect(jest.mocked(validateUserToken).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(db.user.findUnique).mock.invocationCallOrder[0]
    );
  });

  it('returns private errors for bad filters, foreign scope and oversized exports without file bytes', async () => {
    const invalid = await GET(request(`${valid}&from=2026-09-21`));
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('content-disposition')).toBeNull();
    expect(readReportingForOwner).not.toHaveBeenCalled();

    jest.mocked(readReportingForOwner).mockResolvedValueOnce(null);
    const foreign = await GET(request(valid));
    expect(foreign.status).toBe(404);
    expect(foreign.headers.get('content-disposition')).toBeNull();

    const large = snapshot();
    large.taskRows = Array(REPORT_WORKBOOK_MAX_ROWS + 1).fill(large.taskRows[0]);
    jest.mocked(readReportingForOwner).mockResolvedValueOnce(large);
    const oversized = await GET(request(valid));
    expect(oversized.status).toBe(413);
    expect(oversized.headers.get('cache-control')).toBe('private, no-store');
    expect(oversized.headers.get('content-disposition')).toBeNull();
    expect((await oversized.json()).error).toMatch(/narrow/i);
  });

  it('returns a private non-download 400 for an over-limit range before reading report data', async () => {
    const response = await GET(request('from=2026-01-15&to=2026-07-15'));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toBeNull();
    expect(response.headers.get('content-type')).toContain('application/json');
    expect((await response.json()).fields.to).toMatch(/six calendar months/i);
    expect(db.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'owner-1' } }));
    expect(readReportingForOwner).not.toHaveBeenCalled();
  });

  it('returns a private non-download response when generation fails', async () => {
    jest.mocked(readReportingForOwner).mockRejectedValueOnce(new Error('database unavailable'));
    const response = await GET(request(valid));
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-disposition')).toBeNull();
    expect((await response.json()).error).toMatch(/could not be downloaded/i);
  });
});
