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

## 4. Frontend Design Fixes (Whole App)

Based on the frontend-design skill assessment. The app has a strong Atlassian-derived foundation with a clear signature element (the status-stripe system). These fixes address inconsistencies that undermine the design's integrity.

### Fix 4.1: Honest Font Variable Names

**Problem:** CSS variables are named `--font-atlassian-sans` and `--font-atlassian-mono`, but the actual fonts loaded are Inter and JetBrains Mono. The `font-weight: 653` is calibrated for Atlassian Sans/Charlie, not Inter.

**Fix:**
- `src/app/layout.tsx:15` — rename variable from `--font-atlassian-sans` to `--font-inter`
- `src/app/layout.tsx:21` — rename variable from `--font-atlassian-mono` to `--font-jetbrains-mono`
- `src/app/globals.css:8` — `--font-sans: var(--font-atlassian-sans)` → `--font-sans: var(--font-inter)`
- `src/app/globals.css:9` — `--font-mono: var(--font-atlassian-mono)` → `--font-mono: var(--font-jetbrains-mono)`
- `src/app/globals.css:503` — `font-family: var(--font-atlassian-sans), system-ui, sans-serif` → `font-family: var(--font-sans)`

### Fix 4.2: Add Display Tier to Type Scale + Unify Typography

**Problem:** The type scale tops out at 2rem (32px). The landing page bypasses it entirely with raw Tailwind (`text-4xl`, `text-5xl`, `text-6xl`, `font-bold`). Auth forms use `text-2xl font-bold`. Two incompatible systems coexist.

**Fix — add display sizes to `globals.css` type scale:**
```css
.text-display-large  { font-size: 3.75rem; font-weight: 653; line-height: 4rem; }    /* 60px */
.text-display        { font-size: 3rem; font-weight: 653; line-height: 3.25rem; }     /* 48px */
.text-display-small  { font-size: 2.25rem; font-weight: 653; line-height: 2.5rem; }   /* 36px */
```

**Fix — replace raw Tailwind text sizes with the type scale across all landing and auth components:**

| Raw Tailwind | Type scale equivalent | Used in |
|---|---|---|
| `text-6xl` | `text-display-large` | Hero headline (lg) |
| `text-5xl` | `text-display` | Hero headline (sm) |
| `text-4xl` | `text-display-small` | Hero headline (base), section headings |
| `text-3xl` | `text-heading-xxlarge` | Section headings (FAQ, Features, HowItWorks, Showcase, CTA) |
| `text-2xl` | `text-heading-large` | Auth form headings, AnimatedProductPreview timer, Showcase stats |
| `text-lg` | `text-body-large` (body) or `text-heading-small` (headings) | Hero subtitle, Navbar/Footer brand, HowItWorks step titles, Features card titles |
| `text-base` | `text-body-large` | FAQ trigger, Navbar mobile links |
| `text-sm` | `text-body` | Auth form labels/errors/subtitles, Footer links, card descriptions |
| `text-xs` | `text-body-small` | Hero/Features eyebrow text, Showcase stat labels, AnimatedProductPreview meta |
| `font-bold` | `font-weight-bold` | All headings |
| `font-semibold` | `font-weight-semibold` | Eyebrows, brand text, card titles |
| `font-medium` | `font-weight-medium` | Nav links, FAQ trigger |

**Files affected:**
- `src/app/globals.css` — add 3 display classes
- `src/components/landing/Hero.tsx` — replace text sizes/weights
- `src/components/landing/Features.tsx` — replace text sizes/weights
- `src/components/landing/HowItWorks.tsx` — replace text sizes/weights
- `src/components/landing/Showcase.tsx` — replace text sizes/weights
- `src/components/landing/FAQ.tsx` — replace text sizes/weights
- `src/components/landing/CTA.tsx` — replace text sizes/weights
- `src/components/landing/Footer.tsx` — replace text sizes/weights
- `src/components/landing/Navbar.tsx` — replace text sizes/weights
- `src/components/landing/AnimatedProductPreview.tsx` — replace text sizes/weights
- `src/components/auth/login.tsx` — replace text sizes/weights
- `src/components/auth/register.tsx` — replace text sizes/weights

### Fix 4.3: Fix CTA Gradient (Broken Tokens)

**Problem:** `CTA.tsx:10` uses `from-primary to-accent` and `text-primary-foreground` — these are default shadcn tokens that don't exist in the ADS token system. The gradient and text colors are broken/fallback.

**Fix:**
- `CTA.tsx:10` — `bg-gradient-to-br from-primary to-accent` → `bg-gradient-to-br from-brand-bold to-information-bold` (matches the auth split-screen gradient)
- `CTA.tsx:11` — `text-primary-foreground` → `text-text-inverse`
- `CTA.tsx:14` — `text-primary-foreground/80` → `text-text-inverse/80`
- `CTA.tsx:17` — Button `variant="default"` → override to `className="bg-surface text-text-brand hover:bg-surface-raised"` (white button on blue gradient)

### Fix 4.4: Align Skeletons to TaskCardRow

**Problem:** `TaskCardSkeleton` mimics the chunky `EnhancedCard` layout (rounded-xl, p-6 pl-8, progress bar, 2 action buttons) but the actual list renders compact `TaskCardRow`s (rounded-lg, p-150 pl-200, no progress bar, hover-revealed action buttons).

**Fix — rewrite `TaskCardSkeleton` to match `TaskCardRow`:**
- Container: `rounded-lg border bg-surface p-150 pl-200` (not rounded-xl, p-6 pl-8)
- Status stripe: keep (already correct — `absolute left-0 w-1 bg-surface-container`)
- Top row: title skeleton (`h-4 w-3/4`) + duration skeleton (`h-3 w-16`)
- Bottom row: badge skeleton (`h-5 w-20 rounded-xs`) + date skeleton (`h-3 w-12`)
- Remove: progress bar skeleton, action button skeletons (they're hover-revealed in the real component)

**Also update `DashboardSkeleton`:**
- Remove the sidebar skeleton section (lines 7-33) — sidebar is being deleted
- Update the top bar skeleton to reflect new layout (logo + project switcher + right cluster)
- The `TaskCardSkeleton` import auto-inherits the updated layout

### Fix 4.5: Integrate Editor Theme with ADS Tokens

**Problem:** `src/components/editor/themes/editor-theme.css` uses raw hex colors (`#ccc`, `#777`, `slategray`, `#905`, `#690`, `#999`, `#9a6e3a`, `#07a`, `#e90`, `#dd4a68`, `lightgray`) and a wrong token reference (`var(--background)`). These don't adapt to dark mode and look visually disconnected from the app.

**Fix — replace all raw colors with ADS tokens:**

| Raw value | ADS token | Context |
|---|---|---|
| `#ccc` (3 occurrences) | `var(--border)` | Code block borders, gutter border, collapsible border |
| `#777` | `var(--text-subtlest)` | Gutter line numbers |
| `var(--background)` | `var(--surface)` | Collapsible container background |
| `slategray` | `var(--text-subtlest)` | Comment token |
| `#999` | `var(--text-subtle)` | Punctuation token |
| `#905` | `var(--text-discovery-bolder)` | Property token (purple) |
| `#690` | `var(--text-success-bolder)` | Selector token (green) |
| `#9a6e3a` | `var(--text-warning-bolder)` | Operator token (brown) |
| `#07a` | `var(--text-information)` | Attribute token (blue) |
| `#e90` | `var(--text-warning)` | Variable token (orange) |
| `#dd4a68` | `var(--text-danger)` | Function token (red) |
| `lightgray` | `var(--border-bold)` | Collapsible marker |

**Result:** Syntax highlighting automatically adapts to dark mode (all ADS tokens have dark mode values). No visual regression in light mode — the ADS token values are close to the original hex colors.

### Fix 4.6: Design Principle — Signature Element Discipline

Per the frontend-design skill: *"Spend boldness in one place. Let the signature element be the one memorable thing, keep everything around it quiet and disciplined."*

The app's signature element is the **status-stripe system** — the colored left-edge bar on task cards, combined with semantic status badges. This is already well-executed and applied consistently.

**Recommendation (no code change, just principle):** All future UI additions should respect this hierarchy:
- The status-stripe + badge is the one bold visual element
- Everything else (buttons, inputs, cards, navigation) should be quiet and neutral
- Brand blue (`#1868DB`/`#357DE8`) is the secondary accent — used for primary actions and selected states only
- Avoid introducing additional accent colors or decorative elements that compete with the status system

### Verification (Section 4)

After implementation, verify:
1. **Font variables**: No references to `--font-atlassian-*` remain. Inter/JetBrains Mono still render correctly.
2. **Type scale**: Landing page headings use `text-display-*` classes. Auth forms use `text-heading-*`. No raw `text-2xl`/`text-4xl`/`text-6xl`/`font-bold` in landing or auth components.
3. **CTA gradient**: Renders as a blue gradient (not broken/fallback). Button is white with blue text.
4. **Skeletons**: Loading state matches the compact TaskCardRow layout. No progress bar skeleton. DashboardSkeleton has no sidebar section.
5. **Editor theme**: Code blocks and syntax highlighting render correctly in both light and dark mode. Borders and text adapt to theme.
6. Run `pnpm typecheck` and `pnpm lint` to confirm no errors.
