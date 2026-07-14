import ExcelJS from 'exceljs';

import { Statuses } from '@/constants/status';
import { formatDuration } from '@/utils/time-stats';
import { lexicalToPlainText } from '@/utils/plain-text';

export type ExportTaskRow = {
  id: string;
  title: string;
  status: string;
  totalSeconds: number;
  createdAt: Date;
  progress: string | null;
  todo: string | null;
};

export type ExportSessionRow = {
  taskTitle: string;
  taskStatus: string;
  from: Date;
  to: Date | null;
};

type BuildWorkbookParams = {
  tasks: ExportTaskRow[];
  sessions: ExportSessionRow[];
  projectName: string;
};

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4F46E5' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const applyHeaderStyle = (ws: ExcelJS.Worksheet, columnCount: number) => {
  const headerRow = ws.getRow(1);
  headerRow.font = HEADER_FONT;
  headerRow.fill = HEADER_FILL;
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  for (let i = 1; i <= columnCount; i++) {
    const col = ws.getColumn(i);
    let maxLength = 10;
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cell = row.getCell(i);
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLength) maxLength = len;
    });
    col.width = Math.min(maxLength + 4, 60);
  }
};

/**
 * Builds an ExcelJS workbook with two sheets:
 * 1. "Tasks" — one row per task with summary columns
 * 2. "Sessions" — one row per TaskTime session
 */
export const buildExportWorkbook = ({ tasks, sessions, projectName }: BuildWorkbookParams): ExcelJS.Workbook => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'My Progress';
  wb.title = `${projectName} — Export`;

  // --- Sheet 1: Tasks ---
  const tasksWs = wb.addWorksheet('Tasks');
  tasksWs.columns = [
    { header: 'Title', key: 'title' },
    { header: 'Status', key: 'status' },
    { header: 'Total Time', key: 'totalTime' },
    { header: 'Total Seconds', key: 'totalSeconds' },
    { header: 'Created Date', key: 'createdAt' },
    { header: 'Progress', key: 'progress' },
    { header: 'Todo', key: 'todo' },
  ];

  const sortedTasks = [...tasks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const task of sortedTasks) {
    tasksWs.addRow({
      title: task.title,
      status: Statuses[task.status as keyof typeof Statuses] ?? task.status,
      totalTime: formatDuration(task.totalSeconds),
      totalSeconds: Math.round(task.totalSeconds),
      createdAt: task.createdAt,
      progress: lexicalToPlainText(task.progress),
      todo: lexicalToPlainText(task.todo),
    });
  }

  tasksWs.getColumn('createdAt').numFmt = 'yyyy-mm-dd hh:mm';
  applyHeaderStyle(tasksWs, 7);

  // --- Sheet 2: Sessions ---
  const sessionsWs = wb.addWorksheet('Sessions');
  sessionsWs.columns = [
    { header: 'Task Title', key: 'taskTitle' },
    { header: 'Status', key: 'status' },
    { header: 'Session Start', key: 'from' },
    { header: 'Session End', key: 'to' },
    { header: 'Duration', key: 'duration' },
    { header: 'Duration (sec)', key: 'durationSec' },
  ];

  const sortedSessions = [...sessions].sort((a, b) => b.from.getTime() - a.from.getTime());

  for (const session of sortedSessions) {
    const durationSec = session.to
      ? Math.round((session.to.getTime() - session.from.getTime()) / 1000)
      : null;

    sessionsWs.addRow({
      taskTitle: session.taskTitle,
      status: Statuses[session.taskStatus as keyof typeof Statuses] ?? session.taskStatus,
      from: session.from,
      to: session.to,
      duration: session.to ? formatDuration(durationSec!) : '',
      durationSec: durationSec,
    });
  }

  sessionsWs.getColumn('from').numFmt = 'yyyy-mm-dd hh:mm';
  sessionsWs.getColumn('to').numFmt = 'yyyy-mm-dd hh:mm';
  applyHeaderStyle(sessionsWs, 6);

  return wb;
};

/**
 * Sanitizes a project name for use in a filename.
 * Strips characters that are invalid in filenames: / \ : * ? " < > |
 */
export const sanitizeFilename = (name: string): string => {
  return name.replace(/[/\\:*?"<>|]/g, '').trim() || 'export';
};
