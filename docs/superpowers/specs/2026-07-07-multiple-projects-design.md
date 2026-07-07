# Multiple Projects & Per-Project Analytics

**Date:** 2026-07-07
**Status:** Approved
**Depends on:** Atlassian layout restructuring (Phase 2) — complete

## Summary

Promote the free-form `currentProject` / `currentCompany` string fields on `User` and `Task` into a real `Project` entity that users can create, rename, and archive. The sidebar switcher becomes a real project switcher; selecting a project filters the dashboard (task list + stat cards) to that project. Company is dropped entirely. Analytics keep the existing card style, scoped to the selected project — no charts.

## Decisions

| Decision | Choice |
|---|---|
| Entity scope | `Project` becomes a real model; `Company` dropped entirely |
| Tasks & projects | Every task requires a project (`projectId` required). No "All projects" view |
| Project selection state | Persisted on `User.currentProjectId` (Approach A). Switching calls a server action + `revalidatePath` |
| Project management | Create / rename / archive in the Settings dialog. No separate page |
| Deletion | None — projects are archived (soft delete), never removed |
| Existing data | Drop free-form strings; existing `Task`/`TaskTime` rows are wiped (start fresh) |
| Analytics | Existing stat cards, scoped to the selected project. No charts |

---

## 1. Data Model

### Schema changes (`prisma/schema.prisma`)

**New `Project` model:**

```prisma
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
}
```

**`User` changes:**
- Drop `currentProject String?` and `currentCompany String?`.
- Add `currentProjectId String?` + named relation `"UserActiveProject"` (the active/selected project).
- Add `projects Project[]` back-relation (`"ProjectOwner"`).

**`Task` changes:**
- Drop `currentProject String?` and `currentCompany String?`.
- Add `projectId String` (required) + `Project` relation.
- Add `@@index([userId, projectId])` and `@@index([projectId])` for filtered queries.

Named relations (`"ProjectOwner"`, `"UserActiveProject"`) are required because there are two distinct User↔Project relationships (ownership vs. active selection).

### Migration

Destructive, one-way. Steps:

1. Update `prisma/schema.prisma` (Project model, relations, drop string columns).
2. `pnpm prisma migrate dev --name add-projects-drop-company`:
   - Creates the `Project` table.
   - Adds `Project.ownerId`, `User.currentProjectId`, `Task.projectId` columns.
   - Deletes `TaskTime` rows, then `Task` rows (clears FK-blocked data).
   - Drops `User.currentProject`, `User.currentCompany`, `Task.currentProject`, `Task.currentCompany`.
3. `pnpm prisma generate` — regenerate the client.

Existing tasks and time logs are erased. This was explicitly approved.

---

## 2. Server Actions

New file `src/actions/project.ts` (follows existing `actionClient` + `validateUserToken` + `revalidatePath` pattern):

| Action | Input | Behavior |
|---|---|---|
| `createProject` | `name: string` | Creates project owned by user. If user has no `currentProjectId`, sets it as active (first project auto-activates). Returns created project. |
| `renameProject` | `id, name` | Updates name. |
| `archiveProject` | `id` | Sets `archived=true`, `archivedAt=now`. If it was the active project, switches active to the most recently created non-archived project (or null if none remain). |
| `unarchiveProject` | `id` | Sets `archived=false`, clears `archivedAt`. Does not auto-activate. |
| `switchProject` | `id` | Validates project belongs to user and isn't archived, sets `user.currentProjectId`. |
| `getProjects` | — | Returns user's projects (id, name, archived, task count). Used by Settings + switcher. |

### Updated existing actions (`src/actions/task.ts`)

- `getTasksList` / `getTasksListData` — filter `where: { userId, projectId: user.currentProjectId }`.
- `getTaskStats` — same filter, so cards reflect the selected project.
- `createTask` — drop `project`/`company` string params; auto-assign `projectId: user.currentProjectId`. Rejects creation if no active project (safety net; the UI prevents this).
- `updateTaskDetails` — drop `currentProject`/`currentCompany` from the schema and edit form.

### `src/actions/user.ts`

- Drop `currentProject`/`currentCompany` from the update schema. Project switching goes through `switchProject`, not the user update.

### Filtering scope

Archived projects' tasks are **not** shown on the dashboard (the switcher only offers active projects). Unarchiving a project makes its tasks visible again. No data is lost.

---

## 3. Project Management UI (Settings Dialog)

The existing `src/components/shared/Settings.tsx` (form with `currentProject`/`currentCompany` text inputs + `weekStartDay`) is restructured. The company field is removed.

### New Settings layout

```
┌─ Settings ────────────────────────────────┐
│                                           │
│  Projects                                 │
│  ┌─────────────────────────────────┐      │
│  │ [New project name......] [+ Add]│      │
│  └─────────────────────────────────┘      │
│                                           │
│  ┌───────────────────────────────────┐    │
│  │ Website Redesign      3 tasks  [↩]│   │
│  │ Q3 Marketing          7 tasks  [↩]│   │
│  │ Bug Triage            2 tasks  [↩]│   │
│  └───────────────────────────────────┘    │
│                                           │
│  ▸ Archived (1)                           │
│                                           │
│  ─────────────────────────────────────   │
│  Week starts on    [Monday ▾]             │
│                                           │
│              [Cancel]  [Save]             │
└───────────────────────────────────────────┘
```

### Behavior

- **Add:** type a name + click Add (or Enter). Calls `createProject`. Clears the input. The first project created auto-becomes the active project.
- **Rename:** clicking a project name turns it into an inline input; pressing Enter or blur calls `renameProject`. No separate edit dialog.
- **Archive:** the tray button sets `archived=true`. If archiving the active project, `archiveProject` auto-switches active to the most recently created remaining active project (server-side), and the switcher updates.
- **Archived section:** collapsible list at the bottom, each row shows name + an "Unarchive" button. No rename/archive actions here (unarchive first to edit).
- **Save button:** only persists `weekStartDay`. Project operations (add/rename/archive) apply immediately and cannot be undone by Cancel — Cancel only discards unsaved `weekStartDay` changes.

### Data fetching

Settings is a client component. On open, it calls `getProjects` (returns active + archived with task counts). Project mutations call their actions and refetch the list on success.

### Files / changes

- Modify: `src/components/shared/Settings.tsx` — replace project/company form fields with the project manager; keep `weekStartDay`.
- Modify: `Settings.tsx` props — drop `currentProject`/`currentCompany`.
- Update caller `DashboardSidebar.tsx:184` — stop passing those props.

---

## 4. Sidebar Project Switcher

The existing switcher in `DashboardSidebar.tsx:79-131` currently only displays `currentProject` and opens Settings. It becomes a real switcher.

### Trigger (unchanged visually)

```
┌─────────────────────────────┐
│ 📁  Website Redesign     ▾  │
│     Active project          │
└─────────────────────────────┘
```

- Shows the active project name (or "No project" if `currentProjectId` is null).
- Clicking opens the dropdown.

### Dropdown content

```
┌──────────────────────────────┐
│  Website Redesign      ✓     │  ← active, highlighted
│  Q3 Marketing                │
│  Bug Triage                  │
│  ─────────────────────────── │
│  ⚙  Manage projects          │  ← opens Settings
└──────────────────────────────┘
```

- Lists **active** (non-archived) projects only. Selecting one calls `switchProject(id)` → updates `currentProjectId` → `revalidatePath` → dashboard re-fetches with the new filter.
- The active project is highlighted with `bg-selected` and a check icon (matches existing Atlassian selected styling).
- "Manage projects" opens the Settings dialog (same as today).

### Edge case: no active projects

If the user has zero active projects (fresh account, or all archived), the trigger shows:

```
┌─────────────────────────────┐
│ 📁  Create a project     ▾  │
└─────────────────────────────┘
```

Clicking it opens Settings directly (focused on the project manager). The dashboard shows an empty state prompting project creation rather than the task list.

### Files

- Modify: `src/components/dashboard/DashboardSidebar.tsx` — replace the display-only dropdown with a real project list + `switchProject` calls.
- `useUserContext()` already exposes `user` and `refetchUser`; after `switchProject` succeeds, `refetchUser()` refreshes the active project name on the trigger.

---

## 5. Dashboard Filtering & Task Components

### Server component (`src/app/dashboard/page.tsx`)

No structural change. The same three parallel fetches:

```tsx
const [task, stats, initialTasksData] = await Promise.all([
  findUserLastWorkingTask(),   // now: WHERE projectId = user.currentProjectId
  getTaskStats(),              // now: scoped to selected project
  getTasksListData(4, null),   // now: scoped to selected project
]);
```

Filtering happens **inside** each action (they read `user.currentProjectId`), so the page component stays simple. When `switchProject` calls `revalidatePath('/dashboard')`, the server re-renders with the new filter.

### Empty state — no active project

If `currentProjectId` is null, the page renders an empty state instead of the task list:

```
┌──────────────────────────────────────────┐
│            📁                             │
│      No project selected                  │
│  Create or select a project to start      │
│           tracking tasks.                 │
│         [ Create project ]                │
└──────────────────────────────────────────┘
```

The button opens Settings (project manager). This also covers brand-new accounts before their first project.

### Task components — drop redundant project/company display

The project is now the dashboard's active context (shown in the switcher) and company is gone entirely, so remove the now-redundant fields:

- `TaskCardRow.tsx:72-75` — remove the `currentProject` chip.
- `EnhancedCard.tsx:82` — remove the `currentProject` subtitle.
- `TaskDetails.tsx:117-136, 209-218` — remove the Project/Company inputs from the edit form and the Project/Company rows from the details view.
- `CompleteTask.tsx`, `CreateTask.tsx` — remove the project/company inputs. `CreateTask` no longer takes a `project` param; the server assigns `currentProjectId`.
- `types/task.ts:13-14` — drop `currentCompany`/`currentProject` from `TaskListItem`.
- `task.context.tsx:33-34` — drop those fields from the `taskData` type.

### Analytics cards

The existing stat cards (whatever `getTaskStats` currently returns — task counts, total time, etc.) are **unchanged in design**, just scoped to the selected project. No new cards, no charts. Card values update automatically on project switch via revalidation.

---

## 6. Migration, Validation & Testing

### Validation (Zod schemas)

New `src/schema/project.ts`:
- `createProject`: `name` — non-empty string, trimmed, max 80 chars.
- `renameProject`: `id` (uuid), `name` — same constraints.
- `archiveProject` / `unarchiveProject` / `switchProject`: `id` (uuid).

Updated `src/schema/user.ts`:
- Remove `currentProject` / `currentCompany` from the update schema.

### Authorization & safety (in actions)

Every project action:
- Calls `validateUserToken()` first.
- Verifies the project belongs to the authenticated user (`ownerId === user.id`) before mutating.
- `switchProject` rejects archived projects.
- `createTask` rejects if `currentProjectId` is null (defense in depth; the UI prevents this via the empty state).

### Testing scope

Tests focus on the action layer (where the logic lives):

- **Project actions:** create (first project auto-activates), rename, archive (auto-switches active), unarchive, switch (rejects archived), ownership checks (rejects other users' projects).
- **Task actions:** `getTasksList`/`getTaskStats` filter by `currentProjectId`; `createTask` auto-assigns and rejects when no active project.
- **Migration:** verify schema applies cleanly on a fresh DB.

Component-level testing is light (consistent with the current codebase) — verified manually via the dev server.

---

## Out of Scope

- Charts / graph visualizations (explicitly deferred — "skip charts for now").
- A dedicated `/dashboard/projects` overview page (dashboard filtering replaces it).
- Company entity (dropped entirely).
- Cross-project aggregation / "All projects" view.
- Project deletion (archive only).
- Sharing projects between users.
