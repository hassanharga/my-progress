# Export to Excel

## Overview

Add an "Export to Excel" feature that downloads a `.xlsx` file with two sheets — a task summary and a session-level time detail — for the current project, with optional date range filtering.

## Decisions

| Decision | Choice |
|----------|--------|
| Format | Real `.xlsx` with two sheets |
| Library | `exceljs` |
| Delivery | Server Action returning base64; client triggers download |
| Scope | Current project only |
| Date filtering | Presets (All time / This week / This month / Last month) + custom date picker |
| UI placement | Button in Tasks header, next to "Add" |
| Auth | `validateUserToken()` (same as all actions) |

## Architecture & Data Flow

```
[Export Button in Tasks Header]
        | click
        v
[Export Dialog (shadcn Dialog)]
  - RadioGroup: All time | This week | This month | Last month | Custom
  - If Custom -> Calendar date picker (from/to)
  - Download button
        |
        v
[Server Action: exportTasks]
  1. validateUserToken() -> userId
  2. Resolve currentProjectId from user
  3. Compute date range from preset or custom dates
  4. Query all tasks (currentProjectId + date filter on createdAt)
       Include: title, status, totalSeconds, createdAt, progress, todo
  5. Query all TaskTime sessions for those tasks (date filter on `from`)
  6. Call buildExportWorkbook(tasks, sessions, projectName)
  7. Return { base64, filename }
        |
        v
[Client: create Blob from base64 -> trigger download]
```

## New Files

| File | Purpose |
|------|---------|
| `src/utils/export-tasks.ts` | Workbook-building logic using ExcelJS. Pure function: takes tasks + sessions + metadata, returns a Buffer. |
| `src/utils/plain-text.ts` | Extracts plain text from Lexical rich-text JSON strings (for progress/todo fields). |
| `src/components/task/Buttons/ExportTasks.tsx` | Client component: export button + dialog. Uses `useAction` from next-safe-action. |
| `src/schema/export.ts` | Zod schema for export options (preset enum + optional custom date range). |

## Modified Files

| File | Change |
|------|--------|
| `src/actions/task.ts` | Add `exportTasks` server action |
| `src/components/task/index.tsx` | Add `<ExportTasks />` button next to the "Add" button |
| `src/types/task.ts` | Add `ExportPreset` type and `ExportOptions` interface |

## New Dependency

- `exceljs` — full-featured Excel workbook generation, works server-side in Next.js

## Excel Workbook Structure

### Sheet 1: "Tasks" (Summary)

One row per task.

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| Title | Text | `task.title` | |
| Status | Text | `Statuses[task.status]` | Human-readable ("In progress", "Completed") |
| Total Time | Text | `formatDuration(task.totalSeconds)` | "2h 30m" format, matches UI |
| Total Seconds | Number | `task.totalSeconds` | Raw number for SUM/formulas |
| Created Date | Date | `task.createdAt` | Excel date format |
| Progress | Text | plain text from `task.progress` | Stripped of Lexical markup |
| Todo | Text | plain text from `task.todo` | Stripped of Lexical markup |

Sorted by Created Date descending (newest first).

### Sheet 2: "Sessions" (Time Detail)

One row per TaskTime session.

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| Task Title | Text | `task.title` | Denormalized for readability |
| Status | Text | `Statuses[task.status]` | |
| Session Start | DateTime | `session.from` | |
| Session End | DateTime | `session.to` | Blank if session still open |
| Duration | Text | `formatDuration(seconds)` | "1h 15m" |
| Duration (sec) | Number | computed | Raw for SUM/formulas |

Sorted by Session Start descending.

### Workbook Metadata

- **Filename:** `{sanitizedProjectName}-export-{YYYY-MM-DD}.xlsx`
- **Styling:** Bold header row, frozen first row, auto-width columns, header row fill color

## Date Filtering

### Presets

| Preset | Range |
|--------|-------|
| All time | No date filter |
| This week | Start of current week (based on user's `weekStartDay`) to now |
| This month | 1st of current month to now |
| Last month | 1st to last day of previous month |
| Custom | User-selected from/to dates (inclusive, full days) |

### Filtering Rules

- **Tasks sheet:** Filters on `task.createdAt` within the date range
- **Sessions sheet:** Filters on `session.from` within the date range

## Zod Schema (`src/schema/export.ts`)

```typescript
export const exportPresetSchema = z.enum([
  'all_time',
  'this_week',
  'this_month',
  'last_month',
  'custom',
]);

export const exportOptionsSchema = z.object({
  preset: exportPresetSchema,
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}).refine(
  (data) => data.preset !== 'custom' || (data.dateFrom && data.dateTo),
  { message: 'Custom preset requires dateFrom and dateTo' },
);
```

## Server Action (`exportTasks`)

```typescript
'use server';

export const exportTasks = actionClient
  .inputSchema(exportOptionsSchema)
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    // 1. Get currentProjectId
    // 2. Compute date range from preset
    // 3. Query tasks + sessions
    // 4. Build workbook via buildExportWorkbook()
    // 5. Convert to buffer -> base64
    // 6. Return { base64, filename }
  });
```

Returns `{ base64: string, filename: string }` on success.

## UI Component (`ExportTasks.tsx`)

Client component using shadcn Dialog, RadioGroup, Popover + Calendar:

- Trigger: `Button` variant="outline" with `Download` icon + "Export" label
- Dialog title: "Export to Excel"
- Dialog description includes project name
- RadioGroup with 5 options
- When "Custom range" is selected, show Calendar in Popover for from/to date selection
- "Download .xlsx" button triggers the action
- Loading state: button shows spinner, disabled
- Success: `toast.success("Export downloaded")`, file downloads
- Error: `toast.error("Export failed. Please try again.")`

## Plain Text Extraction (`src/utils/plain-text.ts`)

Lexical stores rich text as serialized JSON. This utility parses the JSON and walks the node tree to extract concatenated text content. If parsing fails (not valid JSON or null), returns the raw string or empty string.

## Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| No tasks in date range | Excel with headers only + note row "No tasks found in this date range." Toast warning. |
| No current project | Export button hidden (same condition as Add button) |
| Action failure (DB error) | `toast.error("Export failed. Please try again.")` |
| Empty progress/todo | Blank cell |
| Open session (session.to is null) | Session End blank; Duration blank (moving target) |
| Special chars in project name | Sanitized for filename (strip `/ \ : * ? " < > \|`) |

## Out of Scope (YAGNI)

- CSV export
- Multi-project export
- Scheduled/automated exports
- Column selection / customization
- Chart generation inside Excel
