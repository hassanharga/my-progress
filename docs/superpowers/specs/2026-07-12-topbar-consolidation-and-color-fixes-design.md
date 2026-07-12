# Top Bar Consolidation & Color Fixes

**Date:** 2026-07-12
**Status:** Approved

## Summary

Three UI improvements bundled together:
1. Remove the sidebar and move its content (logo, project switcher, settings) into the top bar
2. Fix primary buttons that look faded/disabled in dark mode
3. Improve status badge colors that appear muddy or washed out

## 1. Top Bar Redesign (Remove Sidebar)

### Problem

The sidebar occupies 240px (`w-60`) of horizontal space for very little content — just a logo, a project switcher dropdown, and two nav items (Tasks, Settings). This wastes horizontal real estate that could go to task content.

### Solution

Move all sidebar content into the existing top bar and delete the sidebar entirely.

### New Top Bar Layout

```
[M logo] [Project Switcher dropdown]          [+ Create task]  [theme toggle]  [Avatar dropdown]
```

- **Far left**: Small "M" badge (32x32, `bg-brand-bold` square with white "M")
- **Next to it**: Project switcher dropdown (compact horizontal trigger: folder icon + active project name + chevron). Same dropdown menu and server actions as current sidebar version.
- **Right cluster** (unchanged): Create task button, theme toggle dropdown, user avatar dropdown
- **Avatar dropdown** gains a new "Settings" menu item (with gear icon) above the separator and "Log out"
- **Settings dialog**: Same `<Settings>` component, triggered from the avatar menu instead of sidebar nav
- **"Tasks" title**: Removed — the project name in the switcher provides context
- **Mobile menu button**: Removed — no sidebar to slide in. All navigation is already in the top bar.

### Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/ProjectSwitcher.tsx` | **New file.** Extracted from sidebar. Compact horizontal trigger version. |
| `src/components/dashboard/DashboardTopBar.tsx` | Import ProjectSwitcher, add logo, add Settings to avatar dropdown. Remove mobile menu button and "Tasks" title. |
| `src/components/dashboard/DashboardSidebar.tsx` | Deleted entirely. |
| `src/components/dashboard/DashboardShell.tsx` | Simplify to `<DashboardTopBar /> + <main>`. Remove `mobileOpen` state and sidebar import. |
| `src/app/dashboard/layout.tsx` | No changes — still renders `<DashboardShell>`. |

### Project Switcher Adaptation

The `ProjectSwitcher` component is extracted from `DashboardSidebar.tsx` and adapted:
- **Trigger**: Horizontal compact button (folder icon + project name + chevron) instead of full-width sidebar item
- **Dropdown**: Same menu, same items (project list with check on active, "Manage projects" at bottom)
- **Server actions**: Same `getProjects` and `switchProject` calls
- **Lives in**: New file `src/components/dashboard/ProjectSwitcher.tsx` (extracted from sidebar, imported by top bar)

### Settings Trigger

Settings moves to the avatar dropdown menu:
```
[Avatar dropdown]
├─ User name (label)
├─ User email (sublabel)
├─ ────────────
├─ Settings (gear icon)  ← NEW
├─ ────────────
└─ Log out (red, danger text)
```

Clicking "Settings" opens the same `<Settings>` dialog. The `settingsOpen` state moves from the sidebar to the top bar.

### What Gets Removed

- `DashboardSidebar.tsx` — entire file deleted
- `mobileOpen` state in `DashboardShell.tsx`
- `<Sheet>` mobile sidebar
- Collapse toggle (`PanelLeftClose` / `ChevronRight`)
- `sidebar-collapsed` localStorage key (orphaned, harmless)
- "Navigation" section label
- "Tasks" hardcoded title in top bar
- Mobile menu button (`Menu` icon) in top bar

## 2. Primary Button Fix

### Problem

In dark mode, primary buttons use `#1868DB` (medium blue, same as light mode) with `#1E1F21` (near-black) text. The contrast ratio is ~3:1, making buttons look muted/disabled. The danger button (`bg-danger-bold text-text-inverse`) has the same problem.

### Root Cause

`--text-inverse` in dark mode is set to `#1E1F21` (dark text), intended for use on bold-colored backgrounds. But `#1868DB` is not bright enough for dark text to have good contrast.

### Fix

Two CSS variable changes in the `.dark` block of `src/app/globals.css`:

**Brighten brand-bold blue:**
- `--background-brand-bold`: `#1868DB` → `#357DE8`
- `--background-brand-bold-hovered`: `#1558BC` → `#1868DB`
- `--background-brand-bold-pressed`: `#144794` → `#1558BC`

**Make inverse text/icons white:**
- `--text-inverse`: `#1E1F21` → `#FFFFFF`
- `--icon-inverse`: `#1E1F21` → `#FFFFFF`

**What stays the same:**
- `--border-inverse` stays `#1E1F21` — used for borders on dark surfaces, not on colored buttons
- Light mode values are unchanged
- `--background-selected-bold` stays `#1868DB` — it's used for selected item backgrounds (e.g. active project in dropdown), not primary buttons. The sidebar (its main consumer) is being deleted, and the remaining usages don't need the brighter blue.

**Result:** New dark mode contrast is `#357DE8` with `#FFFFFF` = ~4.5:1. The danger button (`#C9372C` with white text) also improves.

## 3. Status Badge Color Improvement

### Problem

Status badges use the palest background tier (`bg-information`, `bg-warning`, etc.) with mixed text colors. The success badge is especially muddy: `#37471F` olive text on `#EFFFD6` pale lime. Other badges use non-bolder text variants, creating inconsistency.

### Fix

Update `STATUS_TOKENS` in `src/constants/status.ts` — change the `badge` classes to use the "subtler" background tier and "bolder" text variant consistently:

| Status | Current `badge` classes | New `badge` classes |
|--------|------------------------|---------------------|
| IN_PROGRESS | `bg-information text-text-information border-border-information` | `bg-information-subtler text-text-information-bolder border-border-information` |
| RESUMED | (same as IN_PROGRESS) | (same) |
| PAUSED | `bg-warning text-text-warning border-border-warning` | `bg-warning-subtler text-text-warning-bolder border-border-warning` |
| COMPLETED | `bg-success text-text-success-bolder border-border-success` | `bg-success-subtler text-text-success-bolder border-border-success` |
| CANCELLED | `bg-danger text-text-danger border-border-danger` | `bg-danger-subtler text-text-danger-bolder border-border-danger` |

**Visual changes:**
- Backgrounds: palest → slightly more saturated (e.g. info light: `#E9F2FE` → `#CFE1FD`, info dark: `#0F2D5C` → `#0D2447`)
- Text: all use "bolder" variant for consistency (e.g. info text light: `#1558BC` → `#123263`, info text dark: `#357DE8` → `#6AA1ED`)
- Borders: unchanged
- `stripe` classes: unchanged

**No component changes needed.** Both the `<Status>` standalone component and the `<Badge variant="outline" className={tokens.badge}>` pattern consume the `badge` string from `STATUS_TOKENS`. Updating the constant fixes all usages:
- `src/components/shared/Status.tsx`
- `src/components/task/TaskCardRow.tsx`
- `src/components/task/EnhancedCard.tsx`
- `src/components/task/Buttons/TaskDetails.tsx`

## Verification

After implementation, verify:

1. **Top bar**: Logo visible, project switcher works (switch projects, manage projects opens settings), settings opens from avatar menu, create task button works, no sidebar visible on any screen size
2. **Mobile**: Top bar fits without overflow. Project switcher truncates long names. All buttons accessible.
3. **Primary button**: In dark mode, the "Create task" button is vivid blue with white text. Hover darkens, press darkens further. Danger buttons also look correct.
4. **Light mode**: Primary button unchanged (still `#1868DB` with white text)
5. **Status badges**: All five statuses display with slightly more saturated backgrounds and bolder text. Success badge no longer looks muddy. Run `pnpm typecheck` and `pnpm lint` to confirm no errors.
