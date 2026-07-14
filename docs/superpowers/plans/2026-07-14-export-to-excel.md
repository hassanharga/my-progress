# Export to Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users download a `.xlsx` file with two sheets (task summary + time sessions) for the current project, filtered by date range.

**Architecture:** A Server Action queries tasks and sessions for the current project, builds an Excel workbook with `exceljs`, and returns base64 to the client which triggers a file download. A new dialog component handles date range selection.

**Tech Stack:** Next.js 16 Server Actions, `exceljs`, Zod validation, shadcn/ui (Dialog, Select, Input)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/utils/plain-text.ts` | Extract plain text from Lexical rich-text JSON strings |
| Create | `src/schema/export.ts` | Zod schema for export options (preset + optional custom dates) |
| Create | `src/utils/export-tasks.ts` | Pure function: builds ExcelJS workbook from tasks + sessions |
| Create | `src/components/task/Buttons/ExportTasks.tsx` | Client component: export button + dialog |
| Modify | `src/actions/task.ts` | Add `exportTasks` server action |
| Modify | `src/components/task/index.tsx` | Add `<ExportTasks />` button next to "Add" |
| Install | `exceljs` | New dependency for .xlsx generation |

---

### Task 1: Install exceljs

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run:
```bash
pnpm add exceljs
```

Expected: `exceljs` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Verify it imports**

Run:
```bash
node -e "const x = require('exceljs'); console.log(typeof x.Workbook)"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add exceljs dependency"
```

---

### Task 2: Plain Text Extraction Utility

**Files:**
- Create: `src/utils/plain-text.ts`

Lexical stores rich text as a serialized JSON string with this structure:
```json
{
  "root": {
    "children": [
      {
        "type": "paragraph",
        "children": [
          { "type": "text", "text": "Hello world", ... }
        ]
      }
    ]
  }
}
```

We need to walk the node tree and concatenate all `text` properties, joining paragraphs with newlines.

- [ ] **Step 1: Create `src/utils/plain-text.ts`**

```typescript
type LexicalNode = {
  text?: string;
  type?: string;
  children?: LexicalNode[];
};

type LexicalRoot = {
  root: {
    children: LexicalNode[];
  };
};

/**
 * Extracts plain text from a Lexical serialized editor state JSON string.
 * Walks the node tree and concatenates all text nodes, joining
 * block-level children (paragraphs, list items) with newlines.
 * Returns empty string for null/undefined/empty input.
 */
export const lexicalToPlainText = (serializedState: string | null | undefined): string => {
  if (!serializedState) return '';

  let parsed: LexicalRoot;
  try {
    parsed = JSON.parse(serializedState) as LexicalRoot;
  } catch {
    return serializedState;
  }

  if (!parsed?.root?.children) return '';

  const extractFromNode = (node: LexicalNode): string => {
    if (node.text != null) return node.text;
    if (node.children) return node.children.map(extractFromNode).join('');
    return '';
  };

  return parsed.root.children
    .map(extractFromNode)
    .join('\n')
    .trim();
};
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/plain-text.ts
git commit -m "feat: add lexicalToPlainText utility for rich text extraction"
```

---

### Task 3: Export Zod Schema

**Files:**
- Create: `src/schema/export.ts`

- [ ] **Step 1: Create `src/schema/export.ts`**

```typescript
import { z } from 'zod';

export const exportPresetSchema = z.enum(['all_time', 'this_week', 'this_month', 'last_month', 'custom']);

export const exportOptionsSchema = z
  .object({
    preset: exportPresetSchema,
    dateFrom: z.string().iso().optional(),
    dateTo: z.string().iso().optional(),
  })
  .refine((data) => data.preset !== 'custom' || (data.dateFrom && data.dateTo), {
    message: 'Custom preset requires dateFrom and dateTo',
    path: ['dateFrom'],
  });

export type ExportPreset = z.infer<typeof exportPresetSchema>;
export type ExportOptions = z.infer<typeof exportOptionsSchema>;
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/schema/export.ts
git commit -m "feat: add export options Zod schema"
```

---

### Task 4: Excel Workbook Builder

**Files:**
- Create: `src/utils/export-tasks.ts`

This is a pure function that takes data and returns an ExcelJS workbook. It has no dependency on Prisma or auth — testable in isolation.

The types it receives are shaped to match what the server action will pass:

```typescript
type ExportTaskRow = {
  id: string;
  title: string;
  status: string;
  totalSeconds: number;
  createdAt: Date;
  progress: string | null;
  todo: string | null;
};

type ExportSessionRow = {
  taskTitle: string;
  taskStatus: string;
  from: Date;
  to: Date | null;
};
```

- [ ] **Step 1: Create `src/utils/export-tasks.ts`**

```typescript
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

const HEADER_FILL: Partial<ExcelJS.Fill> = {
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
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/export-tasks.ts
git commit -m "feat: add Excel workbook builder utility"
```

---

### Task 5: Server Action — `exportTasks`

**Files:**
- Modify: `src/actions/task.ts` (add at end of file)
- Reference: `src/helpers/validate-user.tsx` for auth pattern
- Reference: `src/actions/task.ts:285-345` for `getTaskStats` date range computation pattern

The action will:
1. Validate user and get `currentProjectId`
2. Compute date range from preset (or use custom dates)
3. Query tasks + sessions for the current project
4. Build the workbook and convert to base64
5. Return `{ base64, filename }`

- [ ] **Step 1: Add imports to `src/actions/task.ts`**

Add these imports at the top of the file, after the existing imports (after line 14 `import prisma from '@/lib/db';`):

```typescript
import ExcelJS from 'exceljs';
import { endOfMonth, subMonths } from 'date-fns';

import { exportOptionsSchema } from '@/schema/export';
import { buildExportWorkbook, sanitizeFilename, type ExportSessionRow, type ExportTaskRow } from '@/utils/export-tasks';
```

- [ ] **Step 2: Add the `exportTasks` action at the end of `src/actions/task.ts`**

Append after the `getTaskStats` function (after line 345):

```typescript
export const exportTasks = actionClient.inputSchema(exportOptionsSchema).action(async ({ parsedInput }) => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true, weekStartDay: true },
  });

  if (!userData?.currentProjectId) {
    throw new Error('No active project. Create or select a project first.');
  }

  const projectId = userData.currentProjectId;
  const weekStartDay: WeekStartDay = userData.weekStartDay ?? 'MONDAY';

  // Compute date range
  const now = new Date();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  switch (parsedInput.preset) {
    case 'this_week':
      dateFrom = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON[weekStartDay] });
      dateTo = now;
      break;
    case 'this_month':
      dateFrom = startOfMonth(now);
      dateTo = now;
      break;
    case 'last_month':
      dateFrom = startOfMonth(subMonths(now, 1));
      dateTo = endOfMonth(subMonths(now, 1));
      break;
    case 'custom':
      dateFrom = parsedInput.dateFrom ? new Date(parsedInput.dateFrom) : null;
      dateTo = parsedInput.dateTo ? new Date(parsedInput.dateTo) : null;
      break;
    case 'all_time':
    default:
      break;
  }

```typescript
export const exportTasks = actionClient.inputSchema(exportOptionsSchema).action(async ({ parsedInput }) => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true, weekStartDay: true },
  });

  if (!userData?.currentProjectId) {
    throw new Error('No active project. Create or select a project first.');
  }

  const projectId = userData.currentProjectId;
  const weekStartDay: WeekStartDay = userData.weekStartDay ?? 'MONDAY';

  const now = new Date();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  switch (parsedInput.preset) {
    case 'this_week':
      dateFrom = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON[weekStartDay] });
      dateTo = now;
      break;
    case 'this_month':
      dateFrom = startOfMonth(now);
      dateTo = now;
      break;
    case 'last_month':
      dateFrom = startOfMonth(subMonths(now, 1));
      dateTo = endOfMonth(subMonths(now, 1));
      break;
    case 'custom':
      dateFrom = parsedInput.dateFrom ? new Date(parsedInput.dateFrom) : null;
      dateTo = parsedInput.dateTo ? new Date(parsedInput.dateTo) : null;
      break;
    case 'all_time':
    default:
      break;
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      projectId,
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      totalSeconds: true,
      createdAt: true,
      progress: true,
      todo: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const taskIds = tasks.map((t) => t.id);

  const taskTimes = taskIds.length
    ? await prisma.taskTime.findMany({
        where: {
          taskId: { in: taskIds },
          ...(dateFrom || dateTo
            ? {
                from: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : {}),
        },
        include: {
          task: { select: { title: true, status: true } },
        },
        orderBy: { from: 'desc' },
      })
    : [];

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });
  const projectName = project?.name ?? 'project';

  const exportTasksData: ExportTaskRow[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    totalSeconds: t.totalSeconds,
    createdAt: t.createdAt,
    progress: t.progress,
    todo: t.todo,
  }));

  const exportSessionsData: ExportSessionRow[] = taskTimes.map((tt) => ({
    taskTitle: tt.task.title,
    taskStatus: tt.task.status,
    from: tt.from,
    to: tt.to,
  }));

  const workbook = buildExportWorkbook({
    tasks: exportTasksData,
    sessions: exportSessionsData,
    projectName,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const filename = `${sanitizeFilename(projectName)}-export-${now.toISOString().slice(0, 10)}.xlsx`;

  return { base64, filename };
});
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/actions/task.ts
git commit -m "feat: add exportTasks server action"
```

---

### Task 6: Export Dialog Component

**Files:**
- Create: `src/components/task/Buttons/ExportTasks.tsx`

This client component shows an Export button that opens a dialog with preset selection and optional custom date inputs. Uses `useAction` to call the `exportTasks` server action and triggers a file download on success.

The component uses existing shadcn components (Dialog, Select, Input, Button, Label) — no new UI components needed.

- [ ] **Step 1: Create `src/components/task/Buttons/ExportTasks.tsx`**

```typescript
'use client';

import { useState, type FC } from 'react';
import { Download } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { exportTasks } from '@/actions/task';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExportPreset } from '@/schema/export';

const PRESET_LABELS: Record<ExportPreset, string> = {
  all_time: 'All time',
  this_week: 'This week',
  this_month: 'This month',
  last_month: 'Last month',
  custom: 'Custom range',
};

export const ExportTasks: FC = () => {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<ExportPreset>('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { execute, isPending } = useAction(exportTasks, {
    onSuccess: ({ data }) => {
      if (!data) return;
      const binary = atob(data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
      toast.success('Export downloaded');
    },
    onError: () => {
      toast.error('Export failed. Please try again.');
    },
  });

  const handleDownload = () => {
    execute({
      preset,
      ...(preset === 'custom'
        ? {
            dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
            dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
          }
        : {}),
    });
  };

  const isDisabled = preset === 'custom' && (!dateFrom || !dateTo);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]" aria-describedby="Export to Excel">
          <DialogHeader>
            <DialogTitle>Export to Excel</DialogTitle>
            <DialogDescription>
              Download tasks and time sessions as an Excel file with two sheets.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Date range</Label>
              <Select
                value={preset}
                onValueChange={(v) => setPreset(v as ExportPreset)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESET_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {preset === 'custom' && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="date-from">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="date-to">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isPending || isDisabled}
            >
              {isPending ? 'Generating...' : 'Download .xlsx'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/task/Buttons/ExportTasks.tsx
git commit -m "feat: add ExportTasks dialog component"
```

---

### Task 7: Wire Export Button into Tasks Header

**Files:**
- Modify: `src/components/task/index.tsx:60-69` (the Tasks header bar with the Add button)

- [ ] **Step 1: Add import**

In `src/components/task/index.tsx`, add the import after line 13 (`import { TaskDetails } from './Buttons/TaskDetails';`):

```typescript
import { ExportTasks } from './Buttons/ExportTasks';
```

- [ ] **Step 2: Add the Export button next to the Add button**

Replace the header `<Button>` block (lines 61-69):

```tsx
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface/80 backdrop-blur py-200 -mx-2 px-2 mb-200">
          <div className="flex items-center gap-075">
            <h2 className="text-heading-small font-weight-bold text-text">Tasks</h2>
          </div>
          <div className="flex items-center gap-2">
            <ExportTasks />
            <Button variant="subtle" size="sm" className="cursor-pointer" onClick={() => setOpenCreateTaskDrawer(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </div>
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/task/index.tsx
git commit -m "feat: add export button to tasks header"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors (fix any that appear)

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

1. Start dev server: `pnpm dev`
2. Log in, select a project
3. Click "Export" button next to "Add"
4. Try "All time" preset → click "Download .xlsx" → verify file downloads
5. Open the file → verify two sheets: "Tasks" and "Sessions"
6. Try "This week" preset → verify filtered results
7. Try "Custom range" → pick dates → verify it requires both dates before enabling download
8. Verify empty state: if no tasks in range, file should still download with headers only

- [ ] **Step 5: Commit any lint fixes**

```bash
git add -A
git commit -m "fix: lint fixes for export feature"
```
