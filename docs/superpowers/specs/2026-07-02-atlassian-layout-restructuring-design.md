# Atlassian Layout Restructuring — Phase 2

**Date:** 2026-07-02  
**Status:** Approved  
**Depends on:** Phase 1 (token migration) — complete

## Summary

Restructure the dashboard layout to match Atlassian product conventions: enrich the topbar with create button and user avatar, add a project/company switcher to the sidebar, replace the task table with Jira-style card rows, and apply Atlassian empty state patterns and motion tokens.

## Decisions

| Decision | Choice |
|---|---|
| Task list format | Card rows (Jira backlog style) |
| Search | Skip for now |
| Sidebar nav items | Minimal — only existing features (Tasks, Settings) |
| User section | Move from sidebar bottom to topbar avatar |
| Scope | Topbar + task cards + sidebar + empty states + motion |

---

## 1. TopBar Enrichment

### Current state
`DashboardTopBar.tsx` (52 lines): sticky `h-14` bar with mobile menu button + theme dropdown. No title, no create button, no user context.

### New layout

```
┌──────────────────────────────────────────────────────┐
│ [☰]  Tasks                    [+ Create]  [☀️] [JD ▾]│
└──────────────────────────────────────────────────────┘
```

**Left:**
- Mobile menu button (`md:hidden`) — existing, triggers sidebar sheet
- Page title: "Tasks" (`text-heading-xsmall font-weight-bold text-text`)

**Right:**
- **Create button**: `variant="primary" size="sm"`, icon `Plus` + "Create task". Opens the same create task drawer as the existing `Plus` button in the task list header.
- **Theme toggle**: existing dropdown (Light/Dark/System)
- **User avatar**: circular initials avatar with dropdown menu containing name, email, and "Log out" button. Uses `Avatar` + `DropdownMenu` from shadcn/ui.

### Files
- Modify: `src/components/dashboard/DashboardTopBar.tsx`
- The user context (`useUserContext()`) provides `user` and `logout` — move these references from `DashboardSidebar.tsx` to `DashboardTopBar.tsx`.

---

## 2. Task Card Rows (replace table)

### Current state
`src/components/task/List.tsx` (64 lines): renders tasks in a 5-column `<TableData>` component with pagination.

### New design

Replace the table with a vertical list of card rows. Each row is a clickable card:

```
┌──────────────────────────────────────────────────────────┐
│ ▌ Task title here                    2h 30m  ·  ProjectX │
│  [In progress]  Jul 1                    [▶] [✓] [⋯]    │
└──────────────────────────────────────────────────────────┘
```

**Card row structure:**
- Container: `bg-surface border-border rounded-lg p-150 cursor-pointer hover:bg-surface-container transition-colors`
- Left accent stripe: `w-1 rounded-full` using `STATUS_TOKENS[status].stripe` color
- Row 1 (flex justify-between):
  - Title: `text-body font-weight-medium text-text` (truncated, `max-w-[60%] truncate`)
  - Right meta: duration + project/company (`text-body-small text-text-subtle`)
- Row 2 (flex justify-between, mt-050):
  - Left: status badge (`STATUS_TOKENS[status].badge`) + created date (`text-body-small text-text-subtlest`)
  - Right: inline actions (hover-visible on desktop, always visible on mobile):
    - Resume/Pause button (`ghost`/`subtle` size `icon-sm`, Play/Pause icon)
    - Complete button (`ghost`/`subtle` size `icon-sm`, Check icon)
    - More menu (`ghost`/`subtle` size `icon-sm`, MoreHorizontal icon) — opens edit/delete options

**Sticky list header:**
- `sticky top-14 z-10 bg-surface/80 backdrop-blur` (sticks below topbar)
- "Tasks" label (`text-heading-xsmall font-weight-bold`) + count badge
- Pagination controls on the right (existing pagination logic reused)

**Raised variant for active task:**
- When a task is IN_PROGRESS or RESUMED, add `shadow-raised` to make it stand out

### New component
- Create: `src/components/task/TaskCardRow.tsx` — single card row component
- Modify: `src/components/task/List.tsx` — replace `<TableData>` with map over `<TaskCardRow>` list
- Remove: pagination table dependency (reuse pagination logic with different UI)

### Files
- Create: `src/components/task/TaskCardRow.tsx`
- Modify: `src/components/task/List.tsx`
- Modify: `src/components/task/index.tsx` (update list header section)

---

## 3. Sidebar Enrichment

### Current state
`DashboardSidebar.tsx` (186 lines): logo → nav (Tasks, Settings) → user section (avatar, name, logout) → collapse toggle.

### New layout

```
┌────────────────────┐
│ [M] My Progress    │  Logo header (keep)
│                    │
│ ┌────────────────┐ │
│ │ 📁 ProjectX  ▾ │ │  Project/company switcher (new)
│ └────────────────┘ │
│                    │
│ NAVIGATION         │  Section label
│  📋 Tasks          │  Active item
│  ⚙  Settings       │
│                    │
│ (flex spacer)      │
│                    │
│ [«] Collapse       │  Collapse toggle (keep)
└────────────────────┘
```

### Changes

**Project/company switcher (new):**
- Dropdown button at top of sidebar (below logo, above nav)
- Shows: current project name (or "All projects" if none set)
- Click opens dropdown: project field (editable text), company field (editable text), save button
- Reuses the existing Settings action (`updateUserDetails`) — same logic currently in the Settings dialog
- Only visible when sidebar is expanded (hidden in collapsed mode)
- Styled as: `flex items-center gap-075 px-075 py-050 rounded-md hover:bg-neutral-subtle-hovered cursor-pointer`

**Section label:**
- "Navigation" text above nav items: `text-body-small font-weight-bold text-text-subtlest uppercase tracking-wide px-075 pt-200 pb-050`
- Wait — Atlassian uses sentence case and no uppercase. Correct to: `text-body-small text-text-subtlest px-075 pt-200 pb-050`

**Nav item styling:**
- Active: `bg-selected text-text-selected border-l-2 border-border-selected`
- Inactive: `text-text-subtle hover:bg-neutral-subtle-hovered hover:text-text`
- Base: `flex items-center gap-075 px-075 py-075 rounded-md text-body font-weight-medium`

**Remove user section:**
- Delete the avatar + name + logout block from the sidebar bottom
- The logout and user info now live in the topbar avatar dropdown

**Settings dialog:**
- The Settings dialog (currently triggered from sidebar nav) stays as-is
- It's triggered from the "Settings" nav item, same as before
- The project/company switcher in the sidebar also updates the same fields, but inline (no dialog needed for quick edits)

### Collapsed state behavior
- Logo "M" tile stays visible, "My Progress" label hidden
- Project switcher hidden (no room)
- Nav items show icons only
- Section label hidden
- Collapse toggle stays

### Files
- Modify: `src/components/dashboard/DashboardSidebar.tsx`

---

## 4. Empty States

### Current state
`EmptyState` component exists in `src/components/shared/EmptyState.tsx` with icon + title + description + action.

### Changes
Update styling to Atlassian pattern:
- Container: `flex flex-col items-center justify-center py-400 text-center`
- Icon: `size-10 text-icon-subtle mb-150` (40px, subtle icon color)
- Title: `text-heading-medium text-text mb-050` (20px, bold)
- Description: `text-body text-text-subtle mb-200 max-w-sm` (14px, subtle)
- Action: `Button variant="primary"` (brand-bold)

No structural changes to the component API — just CSS class updates.

### Files
- Modify: `src/components/shared/EmptyState.tsx`

---

## 5. Motion Tokens

### Current state
Animations use Framer Motion with arbitrary durations and easings:
- `FadeIn`: delay-based fade
- `SlideIn`: delay-based slide
- `ScaleIn`: spring-based scale
- `StaggerList`: staggered list animation

### Changes
Update all animation configs to use Atlassian motion tokens:

| Animation | Duration | Easing |
|---|---|---|
| Page transition | 200ms (medium) | `cubic-bezier(0.4, 1, 0.6, 1)` (out-practical) |
| FadeIn | 150ms (short) | out-practical |
| SlideIn | 200ms (medium) | out-practical |
| Card hover lift | 150ms (short) | out-practical |
| List stagger | 50ms (xxshort) per item | out-practical |

Replace hardcoded values in animation components with these tokens.

### Files
- Modify: `src/components/shared/animations/FadeIn.tsx`
- Modify: `src/components/shared/animations/SlideIn.tsx`
- Modify: `src/components/shared/animations/ScaleIn.tsx`
- Modify: `src/components/shared/animations/StaggerList.tsx`
- Modify: `src/components/shared/PageTransition.tsx`

---

## Files Summary

### Modified
- `src/components/dashboard/DashboardTopBar.tsx` — add title, create button, user avatar dropdown
- `src/components/dashboard/DashboardSidebar.tsx` — add project switcher, section label, remove user section, update nav styling
- `src/components/task/List.tsx` — replace table with card row list
- `src/components/task/index.tsx` — update list section header
- `src/components/task/EnhancedCard.tsx` — update current task card styling
- `src/components/shared/EmptyState.tsx` — Atlassian empty state pattern
- `src/components/shared/animations/FadeIn.tsx` — Atlassian motion
- `src/components/shared/animations/SlideIn.tsx` — Atlassian motion
- `src/components/shared/animations/ScaleIn.tsx` — Atlassian motion
- `src/components/shared/animations/StaggerList.tsx` — Atlassian motion
- `src/components/shared/PageTransition.tsx` — Atlassian motion

### Created
- `src/components/task/TaskCardRow.tsx` — individual task card row component

### Not changed
- `DashboardShell.tsx` — the shell structure (sidebar + topbar + main) stays the same
- Server actions, database, authentication
- Landing page components
- Auth page components
