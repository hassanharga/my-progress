# Multiple Projects & Per-Project Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote free-form `currentProject`/`currentCompany` strings into a real `Project` entity users can create, rename, and archive; make the sidebar switcher filter the dashboard by the selected project; drop company entirely.

**Architecture:** `User.currentProjectId` (FK) stores the active project. Switching calls a server action + `revalidatePath`. Task list, stats, and creation all read the user's `currentProjectId` server-side. Project CRUD lives in the Settings dialog. Projects are archived, never deleted.

**Tech Stack:** Next.js 16 (App Router, RSC), Prisma 7, PostgreSQL, next-safe-action, Zod, shadcn/ui, Tailwind CSS 4, Atlassian design tokens.

**Verification note:** This project has **no test framework configured** (the `test` script points at Jest but there is no `jest.config` and zero test files). Per the codebase convention, verification is `pnpm typecheck` + `pnpm lint` + `pnpm build` + manual smoke testing via `pnpm dev`. Do not invent test files.

**Schema-refactor note:** Task 1 changes the Prisma schema and regenerates the client. This intentionally breaks type references to the dropped `currentProject`/`currentCompany` columns until Tasks 2–7 update all call sites. `pnpm typecheck` is therefore expected to fail between Task 1 and Task 7. The checkpoint at the end of Task 7 is where typecheck must pass again.

---

## File Structure

**Create:**
- `src/schema/project.ts` — Zod schemas for project actions.
- `src/actions/project.ts` — Project CRUD + switch + list server actions.
- `src/components/shared/ProjectManager.tsx` — Project list/add/rename/archive UI used inside Settings.

**Modify:**
- `prisma/schema.prisma` — Add `Project` model, relations, drop string columns, add indexes.
- `src/schema/user.ts` — Drop `currentProject`/`currentCompany` from `settingsSchema`.
- `src/types/task.ts` — Drop `currentCompany`/`currentProject` from `TaskListItem`.
- `src/contexts/task.context.tsx` — Drop those fields from `taskData` type.
- `src/actions/task.ts` — Filter by `currentProjectId`; drop company; auto-assign `projectId`.
- `src/actions/user.ts` — `me` selects `currentProject` relation; `updateSettings` drops company/project.
- `src/components/shared/Settings.tsx` — Replace company/project fields with `<ProjectManager />`.
- `src/components/dashboard/DashboardSidebar.tsx` — Real project switcher; drop Settings props.
- `src/components/task/TaskCardRow.tsx` — Remove project chip.
- `src/components/task/EnhancedCard.tsx` — Remove project subtitle.
- `src/components/task/Buttons/CreateTask.tsx` — Remove project input.
- `src/components/task/Buttons/TaskDetails.tsx` — Remove project/company inputs + display rows.
- `src/components/task/index.tsx` — Drop `project` from `handleCreateTask` signature.
- `src/app/dashboard/page.tsx` — No-active-project empty state.

---

## Task 1: Prisma Schema & Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update the schema**

Replace the `User` model, add the `Project` model, and update the `Task` model. The final `schema.prisma` models section should read:

```prisma
model User {
  id              String        @id @default(uuid())
  email           String        @unique
  password        String
  name            String
  currentProjectId String?
  currentProject   Project?      @relation("UserActiveProject", fields: [currentProjectId], references: [id])
  weekStartDay    WeekStartDay  @default(MONDAY)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  tasks           Task[]
  projects        Project[]     @relation("ProjectOwner")
}

model Project {
  id         String    @id @default(uuid())
  name       String
  archived   Boolean   @default(false)
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  owner          User       @relation("ProjectOwner", fields: [ownerId], references: [id])
  ownerId        String
  activeForUsers User[]     @relation("UserActiveProject")
  tasks          Task[]

  @@index([ownerId])
  @@index([ownerId, archived])
}

enum TaskStatus {
  IN_PROGRESS
  PAUSED
  RESUMED
  COMPLETED
  CANCELLED
}

enum WeekStartDay {
  SUNDAY
  MONDAY
  SATURDAY
}

model Task {
  id            String     @id @default(uuid())
  title         String
  status        TaskStatus @default(IN_PROGRESS)
  progress      String?
  todo          String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  User        User       @relation(fields: [userId], references: [id])
  userId      String
  Project     Project    @relation(fields: [projectId], references: [id])
  projectId   String
  loggedTime  TaskTime[]
  totalSeconds Float     @default(0)

  @@index([userId])
  @@index([userId, updatedAt])
  @@index([userId, status])
  @@index([userId, projectId])
  @@index([projectId])
}

model TaskTime {
  id   String    @id @default(uuid())
  from DateTime
  to   DateTime?

  Task   Task   @relation(fields: [taskId], references: [id])
  taskId String

  @@index([taskId])
  @@index([taskId, from])
}
```

Key removals from the old schema: `User.currentProject String?`, `User.currentCompany String?`, `Task.currentProject String?`, `Task.currentCompany String?`.

- [ ] **Step 2: Confirm the destructive migration is OK**

This migration deletes all `TaskTime` and `Task` rows (the user approved "drop, start fresh"). Before running, double-check there is no data you need. If unsure, stop and ask.

- [ ] **Step 3: Run the migration**

```bash
pnpm prisma migrate dev --name add-projects-drop-company
```

Expected: a new migration SQL file is created under `prisma/migrations/`, the DB is reset/updated, and `Project` table + new columns exist.

If Prisma prompts about potential data loss, confirm — the wipe is intended.

- [ ] **Step 4: Regenerate the Prisma client**

```bash
pnpm prisma generate
```

Expected: client regenerated to `generated/prisma/client` with the new `Project` model and updated `User`/`Task` types.

- [ ] **Step 5: Verify the schema applies on a fresh DB (optional but recommended)**

```bash
pnpm prisma migrate reset --force
```

Expected: DB dropped and recreated from scratch, migration applies cleanly, seed (if any) runs.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Project model and drop company/currentProject string fields"
```

**Expected typecheck state after this task: FAILS** — code still references dropped columns. Fixed in Tasks 2–7.

---

## Task 2: Zod Schemas & Types

**Files:**
- Create: `src/schema/project.ts`
- Modify: `src/schema/user.ts`
- Modify: `src/types/task.ts`

- [ ] **Step 1: Create project Zod schemas**

Create `src/schema/project.ts`:

```typescript
import { z } from 'zod';

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const projectRenameSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
});

export const projectIdSchema = z.object({
  id: z.uuid(),
});
```

- [ ] **Step 2: Drop company/project from settingsSchema**

In `src/schema/user.ts`, replace the `settingsSchema` with:

```typescript
export const settingsSchema = z.object({
  weekStartDay: z.enum(['SUNDAY', 'MONDAY', 'SATURDAY']).default('MONDAY'),
});
```

Remove the `currentProject` and `currentCompany` lines.

- [ ] **Step 3: Drop fields from TaskListItem**

In `src/types/task.ts`, update `TaskListItem`:

```typescript
export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  duration: string;
  totalSeconds: number;
  createdAt: Date;
};
```

(Remove `currentCompany` and `currentProject`.)

- [ ] **Step 4: Commit**

```bash
git add src/schema/project.ts src/schema/user.ts src/types/task.ts
git commit -m "feat: add project schemas, drop company/project from settings & task types"
```

---

## Task 3: Project Server Actions

**Files:**
- Create: `src/actions/project.ts`

- [ ] **Step 1: Create the project actions file**

Create `src/actions/project.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { validateUserToken } from '@/helpers/validate-user';
import { paths } from '@/paths';
import { actionClient } from '@/lib/action-client';
import prisma from '@/lib/db';
import { projectCreateSchema, projectIdSchema, projectRenameSchema } from '@/schema/project';

export const createProject = actionClient.inputSchema(projectCreateSchema).action(async ({ parsedInput: { name } }) => {
  const user = await validateUserToken();

  const project = await prisma.project.create({
    data: { name, ownerId: user.id! },
  });

  // Auto-activate if the user has no active project yet (first project)
  await prisma.user.updateMany({
    where: { id: user.id!, currentProjectId: null },
    data: { currentProjectId: project.id },
  });

  revalidatePath(paths.dashboard);
  return { id: project.id, name: project.name };
});

export const renameProject = actionClient.inputSchema(projectRenameSchema).action(async ({ parsedInput: { id, name } }) => {
  const user = await validateUserToken();

  const { count } = await prisma.project.updateMany({
    where: { id, ownerId: user.id },
    data: { name },
  });

  if (count === 0) throw new Error('Project not found');

  revalidatePath(paths.dashboard);
});

export const archiveProject = actionClient.inputSchema(projectIdSchema).action(async ({ parsedInput: { id } }) => {
  const user = await validateUserToken();

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!project) throw new Error('Project not found');

  // Archive it
  await prisma.project.update({
    where: { id },
    data: { archived: true, archivedAt: new Date() },
  });

  // If it was the active project, switch to the most recently created remaining active project
  const userData = await prisma.user.findUnique({
    where: { id: user.id! },
    select: { currentProjectId: true },
  });
  if (userData?.currentProjectId === id) {
    const next = await prisma.project.findFirst({
      where: { ownerId: user.id!, archived: false, id: { not: id } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    await prisma.user.update({
      where: { id: user.id! },
      data: { currentProjectId: next?.id ?? null },
    });
  }

  revalidatePath(paths.dashboard);
});

export const unarchiveProject = actionClient.inputSchema(projectIdSchema).action(async ({ parsedInput: { id } }) => {
  const user = await validateUserToken();

  const { count } = await prisma.project.updateMany({
    where: { id, ownerId: user.id },
    data: { archived: false, archivedAt: null },
  });

  if (count === 0) throw new Error('Project not found');

  revalidatePath(paths.dashboard);
});

export const switchProject = actionClient.inputSchema(projectIdSchema).action(async ({ parsedInput: { id } }) => {
  const user = await validateUserToken();

  // Validate ownership and that it isn't archived
  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id, archived: false },
    select: { id: true },
  });
  if (!project) throw new Error('Project not found or archived');

  await prisma.user.update({
    where: { id: user.id! },
    data: { currentProjectId: id },
  });

  revalidatePath(paths.dashboard);
});

export type ProjectListItem = {
  id: string;
  name: string;
  archived: boolean;
  archivedAt: Date | null;
  taskCount: number;
};

export const getProjects = actionClient.action(async () => {
  const user = await validateUserToken();

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      archived: true,
      archivedAt: true,
      _count: { select: { tasks: true } },
    },
  });

  return projects.map(({ _count, ...p }) => ({
    ...p,
    taskCount: _count.tasks,
  })) satisfies ProjectListItem[];
});
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/project.ts
git commit -m "feat: add project server actions (create, rename, archive, switch, list)"
```

---

## Task 4: Update Task Actions (Filter by Project)

**Files:**
- Modify: `src/actions/task.ts`

- [ ] **Step 1: Update `createTask`**

Replace the existing `createTask` (lines ~16–42) with:

```typescript
export const createTask = actionClient
  .inputSchema(z.object({ title: z.string(), progress: z.string().optional() }))
  .action(async ({ parsedInput: { title, progress } }) => {
    const user = await validateUserToken();

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentProjectId: true },
    });

    if (!userData?.currentProjectId) {
      throw new Error('No active project. Create or select a project first.');
    }

    await prisma.task.create({
      data: {
        title,
        progress,
        userId: user.id!,
        projectId: userData.currentProjectId,
        loggedTime: {
          create: {
            from: new Date(),
          },
        },
      },
    });

    revalidatePath(paths.dashboard);
  });
```

Removed: the `project` input param, the `currentCompany`/`currentProject` reads, and those fields from `prisma.task.create`.

- [ ] **Step 2: Update `updateTaskDetails`**

Replace the schema (lines ~108–133) to drop `currentProject`/`currentCompany`:

```typescript
export const updateTaskDetails = actionClient
  .inputSchema(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).optional(),
      progress: z.string().optional(),
      todo: z.string().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    const { id, ...fields } = parsedInput;

    const { count } = await prisma.task.updateMany({
      where: { id, userId: user.id },
      data: fields,
    });

    if (count === 0) {
      throw new Error('Task not found');
    }

    revalidatePath(paths.dashboard);
  });
```

- [ ] **Step 3: Update `findUserLastWorkingTask`**

Add a project filter. Replace the function (lines ~153–172) with:

```typescript
export const findUserLastWorkingTask = async () => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });
  if (!userData?.currentProjectId) return null;

  const task = await prisma.task.findFirst({
    where: {
      status: { in: ['IN_PROGRESS', 'RESUMED', 'PAUSED'] },
      userId: user.id,
      projectId: userData.currentProjectId,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      loggedTime: {
        select: { from: true, to: true },
        orderBy: { from: 'desc' },
        take: 1,
        where: { to: null },
      },
    },
  });

  logger.debug('[findUserLastWorkingTask]', task);

  return mapTask(task);
};
```

- [ ] **Step 4: Update `findUserLastTask`**

Replace (lines ~174–185):

```typescript
export const findUserLastTask = async () => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });
  if (!userData?.currentProjectId) return null;

  const task = await prisma.task.findFirst({
    where: {
      status: { notIn: ['IN_PROGRESS', 'RESUMED', 'PAUSED'] },
      userId: user.id,
      projectId: userData.currentProjectId,
    },
    orderBy: { updatedAt: 'desc' },
  });

  logger.debug('[findUserLastTask]', task);

  return mapTask(task);
};
```

- [ ] **Step 5: Update `getTasksListData`**

Replace (lines ~187–234). Filter by `currentProjectId`, drop the company/project fields from the select and the map:

```typescript
export const getTasksListData = async (limit: number = 10, cursor?: string | null) => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });
  if (!userData?.currentProjectId) {
    return { hasNextPage: false, nextCursor: null, tasks: [] };
  }

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, projectId: userData.currentProjectId },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      status: true,
      totalSeconds: true,
      createdAt: true,
      loggedTime: {
        select: { from: true, to: true },
        orderBy: { from: 'desc' },
        take: 1,
        where: { to: null },
      },
    },
  });

  const hasNextPage = tasks.length > limit;
  const items = hasNextPage ? tasks.slice(0, limit) : tasks;
  const nextCursor = hasNextPage ? items[items.length - 1].id : null;

  return {
    hasNextPage,
    nextCursor,
    tasks: items.map(({ loggedTime, totalSeconds, createdAt, ...task }) => {
      const isActive = ['IN_PROGRESS', 'RESUMED'].includes(task.status);
      const openSession = loggedTime?.find((s) => !s.to);
      const activeFrom = isActive && openSession ? openSession.from : null;

      return {
        ...task,
        totalSeconds,
        createdAt,
        duration: formatTaskDuration(totalSeconds, activeFrom),
      };
    }),
  };
};
```

- [ ] **Step 6: Update `getTaskStats`**

Replace (lines ~270–318). Add `currentProjectId` to the user prefs select and filter every query by it. Early-return zeroes when there is no active project:

```typescript
export const getTaskStats = async () => {
  const user = await validateUserToken();

  const userPrefs = await prisma.user.findUnique({
    where: { id: user.id! },
    select: { weekStartDay: true, currentProjectId: true },
  });
  const weekStartDay: WeekStartDay = userPrefs?.weekStartDay ?? 'MONDAY';
  const projectId = userPrefs?.currentProjectId;

  const zeroes = {
    totalTime: formatDuration(0),
    completedTasks: 0,
    thisWeekTime: formatDuration(0),
    thisMonthTime: formatDuration(0),
  };
  if (!projectId) return zeroes;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON[weekStartDay] });
  const monthStart = startOfMonth(now);

  const [totalSecondsRow, periodStats, statusGroups] = await Promise.all([
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM("totalSeconds"), 0)::float AS total
      FROM "Task"
      WHERE "userId" = ${user.id} AND "projectId" = ${projectId}
    `,
    prisma.$queryRaw<StatsRow[]>`
      SELECT
        COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM
          (LEAST(COALESCE("to", ${now}), ${now}) - GREATEST("from", ${weekStart}))))), 0)::float AS week_seconds,
        COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM
          (LEAST(COALESCE("to", ${now}), ${now}) - GREATEST("from", ${monthStart}))))), 0)::float AS month_seconds
      FROM "TaskTime" tt
      JOIN "Task" t ON t.id = tt."taskId"
      WHERE t."userId" = ${user.id} AND t."projectId" = ${projectId} AND (tt."to" IS NULL OR tt."to" >= ${monthStart})
    `,
    prisma.task.groupBy({
      by: ['status'],
      where: { userId: user.id, projectId },
      _count: { status: true },
    }),
  ]);

  const totalSeconds = totalSecondsRow[0]?.total ?? 0;
  const row = periodStats[0] ?? { week_seconds: 0, month_seconds: 0 };
  const completedCount = statusGroups.find((g) => g.status === 'COMPLETED')?._count.status ?? 0;

  return {
    totalTime: formatDuration(totalSeconds),
    completedTasks: completedCount,
    thisWeekTime: formatDuration(row.week_seconds),
    thisMonthTime: formatDuration(row.month_seconds),
  };
};
```

- [ ] **Step 7: Commit**

```bash
git add src/actions/task.ts
git commit -m "feat: filter tasks & stats by active project, drop company fields"
```

---

## Task 5: Update User Actions

**Files:**
- Modify: `src/actions/user.ts`

- [ ] **Step 1: Update the `me` action select**

In `src/actions/user.ts`, replace the `findUser` call inside `me` (lines ~77–84) so it selects `currentProjectId` and the `currentProject` relation instead of the dropped string columns:

```typescript
    const user = await findUser(data?.email || '', {
      id: true,
      name: true,
      email: true,
      currentProjectId: true,
      currentProject: { select: { id: true, name: true } },
      weekStartDay: true,
    });
```

- [ ] **Step 2: Update `updateSettings`**

Replace `updateSettings` (lines ~94–115). Drop `currentCompany`/`currentProject` from both `select` and `data`:

```typescript
export const updateSettings = actionClient.inputSchema(settingsSchema).action(async ({ parsedInput }) => {
  const { email } = await validateUserToken();

  const data = await db.user.update({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      currentProjectId: true,
      currentProject: { select: { id: true, name: true } },
      weekStartDay: true,
    },
    data: {
      weekStartDay: parsedInput.weekStartDay,
    },
  });

  return data;
});
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/user.ts
git commit -m "feat: me & updateSettings use currentProject relation, drop company"
```

---

## Task 6: Update Task Context Type

**Files:**
- Modify: `src/contexts/task.context.tsx`

- [ ] **Step 1: Drop fields from `taskData` type**

In `src/contexts/task.context.tsx`, update the `taskData` shape inside `TaskContextType` (lines ~29–42). Remove `currentProject` and `currentCompany`:

```typescript
  taskData?: {
    duration: string;
    userId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    status: TaskStatus;
    progress: string | null;
    todo: string | null;
    totalSeconds: number;
  } | null;
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/task.context.tsx
git commit -m "refactor: drop currentProject/currentCompany from task context type"
```

---

## Task 7: Task Components Cleanup

**Files:**
- Modify: `src/components/task/TaskCardRow.tsx`
- Modify: `src/components/task/EnhancedCard.tsx`
- Modify: `src/components/task/Buttons/CreateTask.tsx`
- Modify: `src/components/task/Buttons/TaskDetails.tsx`
- Modify: `src/components/task/index.tsx`

- [ ] **Step 1: Remove project chip from `TaskCardRow.tsx`**

In `src/components/task/TaskCardRow.tsx`, delete the block at lines ~72–77 (the `{task.currentProject && (...)}` span including the `·` separator). The remaining duration block becomes:

```tsx
            <div className="flex shrink-0 items-center gap-075 text-body-small text-text-subtle">
              {task.duration && (
                <span className="flex items-center gap-025">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{task.duration}</span>
                </span>
              )}
            </div>
```

- [ ] **Step 2: Remove project subtitle from `EnhancedCard.tsx`**

In `src/components/task/EnhancedCard.tsx`, delete line ~82:

```tsx
              {task.currentProject && <p className="text-sm text-text-subtle mt-1">{task.currentProject}</p>}
```

- [ ] **Step 3: Remove project input from `CreateTask.tsx`**

In `src/components/task/Buttons/CreateTask.tsx`:

1. Update the `Props.createTask` type (line ~13) to drop `project`:

```typescript
  createTask: ({ progress, title }: { progress: string; title: string }) => void;
```

2. Remove the `project` state (line ~24):

```typescript
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(lastTaskTodo);
```

3. Remove the entire "Project" field block (lines ~47–59 — the Label + Input for `project`).

4. Update the `createTask` call (line ~76) to drop `project`:

```typescript
              createTask({ title, progress });
```

5. Remove the now-unused `useUserContext` import and its call (lines ~4, ~21) since `user` is no longer referenced.

- [ ] **Step 4: Remove project/company from `TaskDetails.tsx`**

In `src/components/task/Buttons/TaskDetails.tsx`:

1. Remove the `currentProject` and `currentCompany` state declarations (lines ~35–36).

2. In `handleEdit` (lines ~49–56), remove the `setCurrentProject`/`setCurrentCompany` lines.

3. In `handleSave` (lines ~62–77), remove `currentProject` and `currentCompany` from the `editTask` payload:

```typescript
    const success = await editTask({
      id: task.id,
      title,
      progress,
      todo,
    });
```

4. In the edit form (lines ~113–139), remove the entire `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">...</div>` block containing the Project and Company inputs.

5. In the meta info grid (lines ~206–220), remove the Project (`FolderOpen`) and Company (`Building2`) `<div>` blocks. Keep Started (`Calendar`) and Total Time (`Clock`).

6. Remove `Building2` and `FolderOpen` from the lucide-react import (line ~6) since they're no longer used.

- [ ] **Step 5: Update `handleCreateTask` in task index**

In `src/components/task/index.tsx`, update `handleCreateTask` (line ~52) to drop `project`:

```typescript
  const handleCreateTask = async (data: { progress: string; title: string }) => {
    await createTask(data);
    setOpenCreateTaskDrawer(false);
    toast.success('Task created!', {
      description: 'Your new task is ready to go.',
    });
  };
```

- [ ] **Step 6: Run typecheck checkpoint**

```bash
pnpm typecheck
```

Expected: **PASS** — all dropped-column references are now resolved. If failures remain, they must be references to `currentProject`/`currentCompany` you missed; fix them before committing.

- [ ] **Step 7: Commit**

```bash
git add src/components/task/
git commit -m "refactor: remove company/project display & inputs from task components"
```

---

## Task 8: ProjectManager Component

**Files:**
- Create: `src/components/shared/ProjectManager.tsx`

- [ ] **Step 1: Create the ProjectManager**

Create `src/components/shared/ProjectManager.tsx`. This is a client component that lists the user's projects with inline rename, archive, and add; archived projects appear in a collapsible section with an unarchive action.

```tsx
'use client';

import { useEffect, useState, type FC } from 'react';
import { Archive, Check, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import {
  archiveProject,
  createProject,
  getProjects,
  renameProject,
  unarchiveProject,
  type ProjectListItem,
} from '@/actions/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ProjectManager: FC = () => {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const { execute: loadProjects } = useAction(getProjects, {
    onSuccess: ({ data }) => {
      if (data) setProjects(data);
    },
  });

  // Load on mount (matches the useUserContext pattern)
  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { execute: executeCreate, isPending: isCreating } = useAction(createProject, {
    onSuccess: () => {
      setNewName('');
      loadProjects();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to create project'),
  });

  const { execute: executeRename } = useAction(renameProject, {
    onSuccess: () => loadProjects(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to rename project'),
  });

  const { execute: executeArchive } = useAction(archiveProject, {
    onSuccess: () => loadProjects(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to archive project'),
  });

  const { execute: executeUnarchive } = useAction(unarchiveProject, {
    onSuccess: () => loadProjects(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to unarchive project'),
  });

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    executeCreate({ name });
  };

  const startEdit = (p: ProjectListItem) => {
    setEditingId(p.id);
    setEditValue(p.name);
  };

  const commitEdit = () => {
    const name = editValue.trim();
    if (editingId && name) {
      executeRename({ id: editingId, name });
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Add new project */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="New project name"
          className="flex-1"
        />
        <Button variant="default" size="sm" onClick={handleAdd} disabled={isCreating || !newName.trim()} className="cursor-pointer shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {/* Active projects */}
      <div className="flex flex-col gap-050">
        {active.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-md border px-150 py-100">
            {editingId === p.id ? (
              <>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onBlur={commitEdit}
                  autoFocus
                  className="h-7 flex-1"
                />
                <Button variant="subtle" size="icon-sm" onClick={commitEdit} className="cursor-pointer shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button variant="subtle" size="icon-sm" onClick={cancelEdit} className="cursor-pointer shrink-0">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="flex flex-1 items-center gap-075 text-start cursor-pointer min-w-0"
                >
                  <span className="truncate text-body font-weight-medium text-text">{p.name}</span>
                </button>
                <span className="shrink-0 text-body-small text-text-subtlest">{p.taskCount} tasks</span>
                <Button
                  variant="subtle"
                  size="icon-sm"
                  onClick={() => executeArchive({ id: p.id })}
                  className="cursor-pointer shrink-0"
                  title="Archive project"
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
        {active.length === 0 && (
          <p className="text-body-small text-text-subtle px-150 py-100">No projects yet. Create one above.</p>
        )}
      </div>

      {/* Archived projects (collapsible) */}
      {archived.length > 0 && (
        <div className="flex flex-col gap-050">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-075 px-150 py-050 text-body-small text-text-subtle cursor-pointer hover:text-text"
          >
            {showArchived ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Archived ({archived.length})
          </button>
          {showArchived &&
            archived.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border px-150 py-100 opacity-70">
                <span className="flex-1 truncate text-body text-text-subtle line-through">{p.name}</span>
                <span className="shrink-0 text-body-small text-text-subtlest">{p.taskCount} tasks</span>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => executeUnarchive({ id: p.id })}
                  className="cursor-pointer shrink-0"
                >
                  Unarchive
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/ProjectManager.tsx
git commit -m "feat: add ProjectManager component for settings"
```

---

## Task 9: Settings Dialog Rewrite

**Files:**
- Modify: `src/components/shared/Settings.tsx`
- Modify: `src/components/dashboard/DashboardSidebar.tsx` (caller — drop props)

- [ ] **Step 1: Rewrite Settings to use ProjectManager**

Replace the entire contents of `src/components/shared/Settings.tsx`:

```tsx
import { useEffect, type FC } from 'react';
import { Controller } from 'react-hook-form';
import { settingsSchema } from '@/schema/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { updateSettings } from '@/actions/user';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WeekStartDay } from '@/utils/time-stats';

import DisplayServerActionResponse from './DisplayServerActionResponse';
import ProjectManager from './ProjectManager';

type Props = {
  weekStartDay: WeekStartDay;
  refetch: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const Settings: FC<Props> = ({ weekStartDay, refetch, open, setOpen }) => {
  const {
    form,
    action: { isExecuting, result },
    handleSubmitWithAction,
  } = useHookFormAction(updateSettings, zodResolver(settingsSchema), {
    errorMapProps: {},
    formProps: {
      mode: 'onChange',
      defaultValues: {
        weekStartDay,
      },
    },
    actionProps: {
      onSuccess: () => {
        refetch();
        setOpen(false);
      },
    },
  });

  useEffect(() => {
    form.setValue('weekStartDay', weekStartDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDay]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your projects and preferences. Click save when you are done.</DialogDescription>
        </DialogHeader>
        {!isExecuting ? <DisplayServerActionResponse result={result} /> : null}

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Projects</Label>
            <ProjectManager />
          </div>

          <form onSubmit={handleSubmitWithAction}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="weekStartDay">Week starts on</Label>
                <Controller
                  control={form.control}
                  name="weekStartDay"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="weekStartDay">
                        <SelectValue placeholder="Select a day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUNDAY">Sunday</SelectItem>
                        <SelectItem value="MONDAY">Monday</SelectItem>
                        <SelectItem value="SATURDAY">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Button type="submit" className="self-end" disabled={isExecuting}>
                Save changes
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

Note: project operations apply immediately (each is its own server action with `revalidatePath`). The Save button only persists `weekStartDay`.

- [ ] **Step 2: Update the Settings caller in the sidebar**

In `src/components/dashboard/DashboardSidebar.tsx`, update the `<Settings>` usage (around line ~182–190). Drop `currentProject`/`currentCompany` props:

```tsx
      {settingsOpen && (
        <Settings
          weekStartDay={user?.weekStartDay ?? 'MONDAY'}
          refetch={refetchUser}
          open={settingsOpen}
          setOpen={setSettingsOpen}
        />
      )}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Settings.tsx src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat: Settings dialog uses ProjectManager, drop company/project fields"
```

---

## Task 10: Sidebar Project Switcher

**Files:**
- Modify: `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1: Replace the display-only switcher with a real switcher**

In `src/components/dashboard/DashboardSidebar.tsx`, replace the entire "Project/Company switcher" block (lines ~79–131 — the `{!collapsed && (...)}` block containing the DropdownMenu) with:

```tsx
      {/* Project switcher (hidden when collapsed) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <ProjectSwitcher onManageProjects={() => { setSettingsOpen(true); onMobileClose(); }} />
        </div>
      )}
```

- [ ] **Step 2: Add the `ProjectSwitcher` component**

Update the imports at the top of `DashboardSidebar.tsx`. The existing lucide-react import (line ~6) should include `Check` — add it. Add a `useEffect` to the `useState` import (line ~3), and add these new imports:

```tsx
import { useEffect, useState } from 'react';   // add useEffect
import { useAction } from 'next-safe-action/hooks';

import { getProjects, switchProject, type ProjectListItem } from '@/actions/project';
```

And add `Check` to the lucide-react import so it reads:

```tsx
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Settings as SettingsIcon,
  PanelLeftClose,
} from 'lucide-react';
```

(`Building2` is no longer used by the switcher but may still be imported; leave it unless lint flags it as unused — remove if so.)

Then, above the `DashboardSidebar` component definition (after the `navItems` const), add:

```tsx
function ProjectSwitcher({ onManageProjects }: { onManageProjects: () => void }) {
  const { user, refetchUser } = useUserContext();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  const { execute: loadProjects } = useAction(getProjects, {
    onSuccess: ({ data }) => {
      if (data) setProjects(data.filter((p) => !p.archived));
    },
  });

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { execute: executeSwitch } = useAction(switchProject, {
    onSuccess: () => refetchUser(),
  });

  const activeId = user?.currentProjectId;
  const activeName = user?.currentProject?.name;
  const activeProjects = projects.filter((p) => !p.archived);

  const triggerLabel = activeName ?? (activeProjects.length === 0 ? 'Create a project' : 'Select project');

  // No projects at all -> open settings directly when the trigger is clicked
  const handleTriggerClick = () => {
    if (activeProjects.length === 0) {
      onManageProjects();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full cursor-pointer items-center gap-075 rounded-md px-075 py-050 text-left hover:bg-neutral-subtle-hovered transition-colors"
          onClick={handleTriggerClick}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-container">
            <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`truncate text-body font-weight-medium ${activeName ? 'text-text' : 'text-text-subtle'}`}>
              {triggerLabel}
            </p>
          </div>
          {activeProjects.length > 0 && <ChevronDown className="h-4 w-4 shrink-0 text-icon-subtle" />}
        </button>
      </DropdownMenuTrigger>
      {activeProjects.length > 0 && (
        <DropdownMenuContent side="bottom" align="start" className="w-56">
          {activeProjects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => executeSwitch({ id: p.id })}
              className={`cursor-pointer ${p.id === activeId ? 'bg-selected text-text-selected' : ''}`}
            >
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === activeId && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onManageProjects} className="cursor-pointer">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Manage projects
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat: sidebar project switcher switches active project"
```

---

## Task 11: Dashboard No-Project Empty State

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add an empty state when there is no active project**

The dashboard is a server component, so it cannot open the Settings dialog directly. Instead, when there is no active project, render a simple empty state that links to the dashboard root (which already renders the sidebar switcher) and instructs the user. Since the Settings dialog is client-side and triggered from the sidebar, the cleanest server-side approach is to render an `EmptyState` with a button that dispatches the same `create-task`-style custom event pattern, OR simply show guidance text.

Simplest: render an empty state that tells the user to create a project via the sidebar. Update `src/app/dashboard/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { findUserLastWorkingTask, getTaskStats, getTasksListData } from '@/actions/task';
import { validateUserToken } from '@/helpers/validate-user';
import db from '@/lib/db';
import TaskPage from '@/components/task';
import TaskProvider from '@/contexts/task.context';
import { EmptyState } from '@/components/shared/EmptyState';
import { FolderOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View and manage your current tasks, track work progress, and analyze productivity statistics.',
  robots: {
    index: false,
    follow: false,
  },
};

function getGreeting() {
  const hours = new Date().getHours();
  if (hours < 12) return 'Good morning';
  if (hours < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function Dashboard() {
  const user = await validateUserToken();

  const userData = await db.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });

  // No active project -> empty state prompting project creation via the sidebar switcher.
  if (!userData?.currentProjectId) {
    return (
      <main className="w-full max-w-7xl overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mt-200">
          <EmptyState
            icon={<FolderOpen className="w-16 h-16" />}
            title="No project selected"
            description="Create or select a project from the sidebar switcher to start tracking tasks."
          />
        </div>
      </main>
    );
  }

  const [task, stats, initialTasksData] = await Promise.all([
    findUserLastWorkingTask(),
    getTaskStats(),
    getTasksListData(4, null),
  ]);

  const greeting = getGreeting();

  return (
    <>
      <TaskProvider
        initialTasks={initialTasksData.tasks}
        initialHasNextPage={initialTasksData.hasNextPage}
        initialNextCursor={initialTasksData.nextCursor}
      >
        <main className="w-full max-w-7xl space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-heading-large text-text">
              {greeting}, {user.name} 👋
            </h1>
            <p className="text-sm text-text-subtle">Here&apos;s your progress at a glance.</p>
          </div>
          <TaskPage task={task} stats={stats} lastTaskTodo={task?.todo || ''} />
        </main>
      </TaskProvider>
    </>
  );
}
```

Note: `EmptyState` is rendered without an `action` button here because the Settings dialog is a client component opened from the sidebar. The empty state copy points the user there. (If you later want a button, you can wrap the page in a client boundary, but that is out of scope.)

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: dashboard empty state when no active project"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS with zero errors.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: PASS. If lint reports unused imports (e.g., `Building2`, `FolderOpen` left over in TaskDetails, or unused `useState`), remove them and re-run.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: build succeeds (runs `prisma generate` + `next build`).

- [ ] **Step 4: Manual smoke test**

Start the dev server and verify each flow:

```bash
pnpm dev
```

Checklist:
1. **Fresh account / no project:** Dashboard shows the "No project selected" empty state.
2. **Create project:** Open Settings (sidebar gear or switcher). Type a project name + Add. It appears in the list and auto-activates (switcher shows its name).
3. **Switch project:** Click the switcher, pick another project. Dashboard task list + stat cards update.
4. **Create task:** Click Create. The dialog has no project/company inputs. Task is created under the active project.
5. **Filtering:** Create tasks under two projects; switch between them — each shows only its own tasks/stats.
6. **Rename:** In Settings, click a project name, type a new name, press Enter. Name updates.
7. **Archive:** Archive the active project. It auto-switches to another active project (or shows empty state if none left). Archived section appears in Settings.
8. **Unarchive:** Expand Archived, click Unarchive. Project returns to active list.
9. **Task details:** Open a task. Project/Company rows are gone from both the view and the edit form.
10. **Task cards:** No project chip on card rows or the enhanced current-task card.

- [ ] **Step 5: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: address verification findings for projects feature"
```

(Only if fixes were needed. Otherwise skip.)

---

## Out of Scope (per spec)

- Charts / graph visualizations.
- Dedicated `/dashboard/projects` overview page.
- Company entity.
- Cross-project "All projects" aggregation.
- Project deletion (archive only).
- Sharing projects between users.
- Automated tests (no test framework is configured in this project).
