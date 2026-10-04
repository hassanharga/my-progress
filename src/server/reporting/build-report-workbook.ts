import ExcelJS from 'exceljs';

import type { ReportingSnapshot } from './read-reporting';

// ExcelJS keeps every worksheet row in memory before serialization.
export const REPORT_WORKBOOK_MAX_ROWS = 50_000;

export class ReportWorkbookTooLargeError extends Error {
  constructor() {
    super('This report is too large to download. Narrow the date range or choose a project and try again.');
    this.name = 'ReportWorkbookTooLargeError';
  }
}

const safeText = (value: string): string => (/^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value);

export const buildReportWorkbook = (snapshot: ReportingSnapshot): ExcelJS.Workbook => {
  if (
    snapshot.taskRows.length > REPORT_WORKBOOK_MAX_ROWS ||
    snapshot.sessionRows.length > REPORT_WORKBOOK_MAX_ROWS ||
    snapshot.taskRows.length + snapshot.sessionRows.length > REPORT_WORKBOOK_MAX_ROWS
  ) {
    throw new ReportWorkbookTooLargeError();
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'My Progress';
  workbook.created = snapshot.generatedAt;

  const scope = workbook.addWorksheet('Scope');
  scope.addRow(['Field', 'Value']);
  const project = snapshot.query.projectId
    ? snapshot.ownedProjects.find((item) => item.id === snapshot.query.projectId)
    : null;
  const entries: Array<[string, string | number]> = [
    ['From (inclusive local date)', snapshot.query.from],
    ['To (inclusive local date)', snapshot.query.to],
    ['Time zone', snapshot.timezone],
    ['Project ID', snapshot.query.projectId ?? 'All owned projects'],
    ['Project', project ? safeText(project.name) : 'All owned projects'],
    ['Current task state', snapshot.query.taskState],
    ['Session correction state', snapshot.query.correctionState],
    ['Captured at (UTC)', snapshot.generatedAt.toISOString()],
    ['Task count', snapshot.taskRows.length],
    ['Session count', snapshot.sessionRows.length],
    ['Planned minutes (estimated items)', snapshot.facts.plannedMinutes],
    ['Plan items without estimate', snapshot.facts.missingEstimateCount],
    ['Tracked task seconds', snapshot.facts.trackedSeconds],
    ['Unique working seconds', snapshot.facts.uniqueWorkingSeconds],
    ['Overlapping tracked seconds', snapshot.facts.overlapSeconds],
    ['Tracked task time definition', 'Sum of matching sessions clipped to the selected local dates.'],
    ['Unique working time definition', 'Elapsed time covered by matching sessions, counting overlap once.'],
    ['Overlapping tracked time definition', 'Tracked task seconds minus unique working seconds.'],
    [
      'Planned time definition',
      'Currently stored plan estimates within the selected local dates; missing estimates are counted separately.',
    ],
    ['Task state definition', 'The current task state at the captured time.'],
    [
      'Session correction definition',
      'Corrected means a correction timestamp is present; open sessions end at the captured time.',
    ],
    ['Scoped seconds definition', 'Session duration after clipping to the selected date range and captured time.'],
  ];
  for (const entry of entries) scope.addRow(entry);
  scope.getColumn(1).width = 40;
  scope.getColumn(2).width = 100;

  const tasks = workbook.addWorksheet('Tasks');
  tasks.addRow([
    'Task ID',
    'Project ID',
    'Project',
    'Task',
    'Current task state',
    'Planned minutes',
    'Plan items without estimate',
    'Tracked task seconds',
    'Session count',
  ]);
  for (const row of snapshot.taskRows) {
    tasks.addRow([
      safeText(row.id),
      safeText(row.projectId),
      safeText(row.projectName),
      safeText(row.title),
      row.status,
      row.plannedMinutes,
      row.missingEstimateCount,
      row.trackedSeconds,
      row.sessionCount,
    ]);
  }
  tasks.addRow([
    'TOTAL',
    '',
    '',
    '',
    '',
    snapshot.facts.plannedMinutes,
    snapshot.facts.missingEstimateCount,
    snapshot.facts.trackedSeconds,
    snapshot.sessionRows.length,
  ]);

  const sessions = workbook.addWorksheet('Sessions');
  sessions.addRow([
    'Session ID',
    'Task ID',
    'Project ID',
    'Project',
    'Task',
    'Original start (UTC)',
    'Original end (UTC)',
    'Corrected at (UTC)',
    'Scoped start (UTC)',
    'Scoped end (UTC)',
    'Correction state',
    'Scoped seconds',
  ]);
  for (const row of snapshot.sessionRows) {
    sessions.addRow([
      safeText(row.id),
      safeText(row.taskId),
      safeText(row.projectId),
      safeText(row.projectName),
      safeText(row.taskTitle),
      row.startedAt,
      row.endedAt,
      row.correctedAt,
      row.scopedStartedAt,
      row.scopedEndedAt,
      row.correctedAt ? 'Corrected' : 'Uncorrected',
      row.scopedSeconds,
    ]);
  }
  sessions.addRow(['TOTAL', '', '', '', '', '', '', '', '', '', '', snapshot.facts.trackedSeconds]);
  for (const column of [6, 7, 8, 9, 10]) sessions.getColumn(column).numFmt = 'yyyy-mm-dd hh:mm:ss.000 "UTC"';

  for (const sheet of [scope, tasks, sessions]) {
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
  return workbook;
};
