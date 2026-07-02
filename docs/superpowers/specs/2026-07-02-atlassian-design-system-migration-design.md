# Atlassian Design System Migration

**Date:** 2026-07-02  
**Status:** Approved  
**Phases:** Phase 1 (Token migration) → Phase 2 (Layout restructuring)

## Summary

Migrate the My Progress app from its current emerald/teal OKLCH palette to the Atlassian Design System (ADS) token structure. Full namespace migration — adopt Atlassian's exact token naming convention, component recipes, typography, spacing scale, radius scale, and four-plane elevation model. Restructure the app layout to Atlassian product conventions in Phase 2.

## Decisions

| Decision | Choice |
|---|---|
| Scope | Full token migration |
| Approach | Full namespace migration (Atlassian's exact token names) |
| Fonts | Atlassian Sans + Atlassian Mono |
| Dark mode | Derive dark theme from Atlassian's token structure |
| Brand color | Atlassian blue (#1868DB) |
| Layout | Restructure to Atlassian patterns (Phase 2) |
| Phasing | Tokens first (Phase 1), layout second (Phase 2) |

---

## Phase 1: Token Migration

### 1.1 CSS Variable Structure

Replace all current CSS variables in `src/app/globals.css` with Atlassian's token structure. Define in `:root` (light theme) and `.dark` (dark theme).

#### Neutrals & Surfaces

| Token | Light | Dark | Current equivalent |
|---|---|---|---|
| `--text` | `#292A2E` | `#DFE1E5` | `--foreground` |
| `--text-subtle` | `#505258` | `#B6B9C0` | `--muted-foreground` |
| `--text-subtlest` | `#6B6E76` | `#8A8D94` | (none) |
| `--text-disabled` | `#080F214A` | `#FFFFFF29` | (none) |
| `--text-inverse` | `#FFFFFF` | `#1E1F21` | `--primary-foreground` |
| `--text-selected` | `#1868DB` | `#357DE8` | (none) |
| `--text-brand` | `#1868DB` | `#357DE8` | (none) |
| `--link` | `#1868DB` | `#357DE8` | (none) |
| `--link-pressed` | `#1558BC` | `#6AA1ED` | (none) |

| Surface token | Light | Dark |
|---|---|---|
| `--surface` | `#FFFFFF` | `#1E1F21` |
| `--surface-sunken` | `#F8F8F8` | `#161719` |
| `--surface-raised` | `#FFFFFF` | `#2B2D31` |
| `--surface-overlay` | `#FFFFFF` | `#2B2D31` |
| `--surface-container` | `#F0F1F2` | `#161719` |

| Border token | Light | Dark |
|---|---|---|
| `--border` | `#0B120E24` | `#FFFFFF1F` |
| `--border-bold` | `#7D818A` | `#B7B9BE` |
| `--border-input` | `#8C8F97` | `#7D818A` |
| `--border-focused` | `#4688EC` | `#4688EC` |
| `--border-selected` | `#1868DB` | `#357DE8` |
| `--border-disabled` | `#0515240F` | `#FFFFFF0F` |

#### Semantic Roles

Each role has four anchors: `text-<role>`, `icon-<role>`, `border-<role>`, `background-<role>-bold`. Backgrounds also have `background-<role>` (subtle), `background-<role>-hovered`, `background-<role>-pressed`, and `background-<role>-subtler`.

**Brand (blue):**
| Token | Light | Dark |
|---|---|---|
| `--background-brand-bold` | `#1868DB` | `#1868DB` |
| `--background-brand-bold-hovered` | `#1558BC` | `#1558BC` |
| `--background-brand-bold-pressed` | `#144794` | `#144794` |
| `--background-brand-subtlest` | `#E9F2FE` | `#0F2D5C` |
| `--text-brand` | `#1868DB` | `#357DE8` |
| `--icon-brand` | `#357DE8` | `#357DE8` |
| `--border-brand` | `#1868DB` | `#357DE8` |

**Success (lime-green):**
| Token | Light | Dark |
|---|---|---|
| `--background-success` | `#EFFFD6` | `#1D3E0D` |
| `--background-success-bold` | `#5B7F24` | `#5B7F24` |
| `--text-success` | `#4C6B1F` | `#B3DF72` |
| `--text-success-bolder` | `#37471F` | `#B3DF72` |
| `--icon-success` | `#22A06B` | `#4BCE97` |
| `--border-success` | `#22A06B` | `#4BCE97` |

**Danger (red):**
| Token | Light | Dark |
|---|---|---|
| `--background-danger` | `#FFECEB` | `#5D1A18` |
| `--background-danger-bold` | `#C9372C` | `#C9372C` |
| `--text-danger` | `#AE2E24` | `#FFB8B2` |
| `--icon-danger` | `#C9372C` | `#E2483D` |
| `--border-danger` | `#E2483D` | `#E2483D` |

**Warning (orange/yellow):**
| Token | Light | Dark |
|---|---|---|
| `--background-warning` | `#FFF5DB` | `#4A2E00` |
| `--background-warning-bold` | `#FBC828` | `#FBC828` |
| `--text-warning` | `#9E4C00` | `#FBD779` |
| `--text-warning-inverse` | `#292A2E` | `#1E1F21` |
| `--icon-warning` | `#E06C00` | `#FCA700` |
| `--border-warning` | `#E06C00` | `#FCA700` |

**Information (blue, same as brand):**
| Token | Light | Dark |
|---|---|---|
| `--background-information` | `#E9F2FE` | `#0F2D5C` |
| `--background-information-bold` | `#1868DB` | `#1868DB` |
| `--text-information` | `#1558BC` | `#357DE8` |
| `--icon-information` | `#357DE8` | `#357DE8` |
| `--border-information` | `#357DE8` | `#357DE8` |

**Discovery (purple):**
| Token | Light | Dark |
|---|---|---|
| `--background-discovery` | `#F8EEFE` | `#2C1E43` |
| `--background-discovery-bold` | `#964AC0` | `#964AC0` |
| `--text-discovery` | `#803FA5` | `#D8A0F7` |
| `--icon-discovery` | `#AF59E1` | `#BF63F3` |
| `--border-discovery` | `#AF59E1` | `#BF63F3` |

#### Interaction

| Token | Light | Dark |
|---|---|---|
| `--interaction-hovered` | `#00000029` | `#FFFFFF29` |
| `--interaction-pressed` | `#00000052` | `#FFFFFF3D` |

#### Misc

| Token | Light | Dark |
|---|---|---|
| `--skeleton` | `#0515240F` | `#FFFFFF0F` |
| `--blanket` | `#050C1F75` | `#050C1F99` |

### 1.2 Tailwind `@theme inline` Mapping

Map all CSS variables to Tailwind utility classes. This replaces the current `@theme inline` block entirely.

```css
@theme inline {
  /* Neutrals */
  --color-text: var(--text);
  --color-text-subtle: var(--text-subtle);
  --color-text-subtlest: var(--text-subtlest);
  --color-text-disabled: var(--text-disabled);
  --color-text-inverse: var(--text-inverse);
  --color-text-selected: var(--text-selected);
  --color-text-brand: var(--text-brand);

  /* Surfaces */
  --color-surface: var(--surface);
  --color-surface-sunken: var(--surface-sunken);
  --color-surface-raised: var(--surface-raised);
  --color-surface-overlay: var(--surface-overlay);
  --color-surface-container: var(--surface-container);

  /* Links */
  --color-link: var(--link);
  --color-link-pressed: var(--link-pressed);

  /* Borders */
  --color-border: var(--border);
  --color-border-bold: var(--border-bold);
  --color-border-input: var(--border-input);
  --color-border-focused: var(--border-focused);
  --color-border-selected: var(--border-selected);
  --color-border-disabled: var(--border-disabled);

  /* Brand */
  --color-brand-bold: var(--background-brand-bold);
  --color-brand-bold-hovered: var(--background-brand-bold-hovered);
  --color-brand-bold-pressed: var(--background-brand-bold-pressed);
  --color-brand-subtlest: var(--background-brand-subtlest);

  /* Success */
  --color-success: var(--background-success);
  --color-success-bold: var(--background-success-bold);
  --color-success-subtler: var(--background-success-subtler);
  --color-text-success: var(--text-success);
  --color-text-success-bolder: var(--text-success-bolder);
  --color-icon-success: var(--icon-success);
  --color-border-success: var(--border-success);

  /* Danger */
  --color-danger: var(--background-danger);
  --color-danger-bold: var(--background-danger-bold);
  --color-danger-subtler: var(--background-danger-subtler);
  --color-text-danger: var(--text-danger);
  --color-icon-danger: var(--icon-danger);
  --color-border-danger: var(--border-danger);

  /* Warning */
  --color-warning: var(--background-warning);
  --color-warning-bold: var(--background-warning-bold);
  --color-text-warning: var(--text-warning);
  --color-text-warning-inverse: var(--text-warning-inverse);
  --color-icon-warning: var(--icon-warning);
  --color-border-warning: var(--border-warning);

  /* Information */
  --color-information: var(--background-information);
  --color-information-bold: var(--background-information-bold);
  --color-text-information: var(--text-information);
  --color-icon-information: var(--icon-information);
  --color-border-information: var(--border-information);

  /* Discovery */
  --color-discovery: var(--background-discovery);
  --color-discovery-bold: var(--background-discovery-bold);
  --color-text-discovery: var(--text-discovery);
  --color-icon-discovery: var(--icon-discovery);
  --color-border-discovery: var(--border-discovery);

  /* Interaction */
  --color-interaction-hovered: var(--interaction-hovered);
  --color-interaction-pressed: var(--interaction-pressed);

  /* Skeleton */
  --color-skeleton: var(--skeleton);

  /* Spacing */
  --spacing-0: 0;
  --spacing-025: 0.125rem;
  --spacing-050: 0.25rem;
  --spacing-075: 0.375rem;
  --spacing-100: 0.5rem;
  --spacing-150: 0.75rem;
  --spacing-200: 1rem;
  --spacing-250: 1.25rem;
  --spacing-300: 1.5rem;
  --spacing-400: 2rem;
  --spacing-500: 2.5rem;
  --spacing-600: 3rem;
  --spacing-800: 4rem;
  --spacing-1000: 5rem;

  /* Radius */
  --radius-xsmall: 0.125rem;
  --radius-small: 0.25rem;
  --radius-medium: 0.375rem;
  --radius-large: 0.5rem;
  --radius-xlarge: 0.75rem;
  --radius-full: 9999px;

  /* Fonts */
  --font-sans: var(--font-atlassian-sans);
  --font-mono: var(--font-atlassian-mono);

  /* Font weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 653;
}
```

This produces utilities like: `bg-surface`, `bg-surface-sunken`, `text-text`, `text-text-subtle`, `bg-brand-bold`, `bg-success`, `bg-danger-bold`, `border-border`, `border-border-input`, `p-100`, `gap-075`, `rounded-medium`, `rounded-xlarge`, etc.

### 1.3 Typography

**Fonts (in `layout.tsx`):**

Remove `next/font/google` imports for Inter and Plus Jakarta Sans. Load Atlassian Sans and Atlassian Mono instead.

Two loading strategies (decide during implementation based on availability):
1. **`@fontsource` packages** — `@fontsource/atlassian-sans` and `@fontsource/atlassian-mono`, imported in layout
2. **Self-hosted via `next/font/local`** — download font files, configure with `next/font/local`

CSS variables: `--font-atlassian-sans` and `--font-atlassian-mono`.

Remove `--font-display` (Plus Jakarta Sans). Atlassian uses a single typeface for both headings and body.

**Type scale CSS classes** (utility classes for headings/body):

```css
@layer utilities {
  .text-heading-xxlarge { font-size: 2rem; font-weight: 653; line-height: 2.25rem; }
  .text-heading-xlarge { font-size: 1.75rem; font-weight: 653; line-height: 2rem; }
  .text-heading-large { font-size: 1.5rem; font-weight: 653; line-height: 1.75rem; }
  .text-heading-medium { font-size: 1.25rem; font-weight: 653; line-height: 1.5rem; }
  .text-heading-small { font-size: 1rem; font-weight: 653; line-height: 1.25rem; }
  .text-heading-xsmall { font-size: 0.875rem; font-weight: 653; line-height: 1.25rem; }
  .text-body-large { font-size: 1rem; font-weight: 400; line-height: 1.5rem; }
  .text-body { font-size: 0.875rem; font-weight: 400; line-height: 1.25rem; }
  .text-body-small { font-size: 0.75rem; font-weight: 400; line-height: 1rem; }
  .font-weight-medium { font-weight: 500; }
  .font-weight-bold { font-weight: 653; }
}
```

**Sentence case rule:** All user-visible text switches to sentence case. Affected areas:
- Button labels: "Save changes", "Cancel", "Complete", "Edit task"
- Dialog titles: "Edit task", "Task details"
- Status badges: "In progress", "Paused", "Completed", "Cancelled"
- Menu items, tab labels, tooltips, empty-state headings, table headers, form labels

### 1.4 Elevation (Shadows)

```css
@layer utilities {
  .shadow-raised {
    box-shadow: 0px 1px 1px #1E1F2140, 0px 0px 1px #1E1F214F;
  }
  .shadow-overlay {
    box-shadow: 0px 8px 12px #1E1F2126, 0px 0px 1px #1E1F214F;
  }
  .shadow-overflow {
    box-shadow: 0px 0px 8px #1E1F2129, 0px 0px 1px #1E1F211F;
  }
}
```

Dark theme shadows use slightly stronger alpha values:
```css
.dark .shadow-raised {
  box-shadow: 0px 1px 1px #00000040, 0px 0px 1px #0000004F;
}
.dark .shadow-overlay {
  box-shadow: 0px 8px 12px #00000026, 0px 0px 1px #0000004F;
}
```

### 1.5 Status Color System

Replace `src/constants/status.ts` entirely. Remove both `StatusColors` (legacy hex) and `STATUS_STYLES` (current Tailwind classes). Replace with a single Atlassian-semantic system:

```typescript
export const STATUS_TOKENS = {
  IN_PROGRESS: {
    badge: 'bg-information text-text-information border-border-information',
    stripe: 'bg-information-bold',
    label: 'In progress',
  },
  RESUMED: {
    badge: 'bg-information text-text-information border-border-information',
    stripe: 'bg-information-bold',
    label: 'In progress',
  },
  PAUSED: {
    badge: 'bg-warning text-text-warning border-border-warning',
    stripe: 'bg-warning-bold',
    label: 'Paused',
  },
  COMPLETED: {
    badge: 'bg-success text-text-success-bolder border-border-success',
    stripe: 'bg-success-bold',
    label: 'Completed',
  },
  CANCELLED: {
    badge: 'bg-danger text-text-danger border-border-danger',
    stripe: 'bg-danger-bold',
    label: 'Cancelled',
  },
} as const;
```

Status labels use sentence case throughout.

### 1.6 Component Restyling

Every shadcn component in `src/components/ui/` and every app component gets restyled. Key component changes:

#### Button (`ui/button.tsx`)

| Variant | Atlassian recipe | Classes |
|---|---|---|
| `primary` (was `default`) | brand-bold | `bg-brand-bold text-text-inverse hover:bg-brand-bold-hovered active:bg-brand-bold-pressed` |
| `default` (was `outline`) | neutral subtle | `bg-transparent text-text-subtle border-border hover:bg-surface-container` |
| `subtle` (was `ghost`) | neutral subtle | `bg-transparent text-text-subtle hover:bg-surface-container` |
| `danger` (was `destructive`) | danger-bold | `bg-danger-bold text-text-inverse hover:opacity-90` |
| `warning` (new) | warning-bold | `bg-warning-bold text-text-warning-inverse` |

Base: `rounded-medium gap-075 font-weight-medium p-075 px-150`
Remove `secondary` variant.

#### Input (`ui/input.tsx`)
- `border-border-input rounded-medium p-075 bg-white dark:bg-surface text-text`
- Focus: `focus:border-border-focused focus:ring-0 focus:border-2`
- Disabled: `bg-surface-container text-text-disabled border-border-disabled`

#### Dialog (`ui/dialog.tsx`)
- `DialogContent`: `bg-surface-overlay shadow-overlay rounded-xlarge`
- `DialogHeader`: `pt-300 pb-200 px-300`
- `DialogTitle`: `text-heading-medium font-weight-bold`
- `DialogFooter`: `pt-200 pb-300 px-300 gap-100`
- Blanket: `bg-blanket`

#### Badge (`ui/badge.tsx`)
- Base: `rounded-xsmall px-050 py-0 text-body-small`
- Semantic variants: `success`, `warning`, `danger`, `information`, `discovery`, `neutral`
- Each uses `bg-*-subtler text-text-*-bolder`

#### Card (`ui/card.tsx`)
- Base: `bg-surface border-border rounded-large` (no shadow)
- `Raised` variant: `bg-surface-raised shadow-raised` (for movable task cards)

#### Spinner (`ui/spinner.tsx`)
- Color: `text-icon-subtle` (was: `text-muted-foreground`)
- Sizes: xsmall (12px), small (16px), medium (24px), large (48px)
- Atlassian spinner animation: `rotateDuration: 0.86s`, `strokeWidth: 1.5px`

#### Other components
All remaining components (Separator, Label, Tooltip, Tabs, etc.) follow the same pattern — swap to Atlassian tokens, apply the corresponding recipe from the DESIGN.md YAML.

#### App-specific components
All components in `src/components/task/`, `src/components/shared/`, `src/components/auth/`, `src/components/dashboard/`, `src/components/editor/`:
- Replace hardcoded Tailwind colors (`text-emerald-600`, `bg-amber-500/10`, `text-red-600`) with semantic tokens
- Replace spacing with the new scale (`gap-4` → `gap-200`, `px-6` → `px-300`, etc.)
- Apply sentence case to all user-visible text
- Apply type scale classes (`text-heading-medium`, `text-body`, `text-body-small`)

### 1.7 Design System Constants Update

Update `src/constants/design-system.ts` to match the new token values (spacing, borderRadius, shadows, animations, zIndex). Align `borderRadius` values with the CSS token scale (fixes the current inconsistency where JS constants differ from CSS variables).

---

## Phase 2: Layout Restructuring (Preview)

Scoped separately after Phase 1 is complete and verified. Key changes:

- **Left sidebar navigation** — collapse to icon-only on mobile, full labels on desktop
- **Top bar** — breadcrumbs, search, theme toggle, user avatar
- **Section message banners** — system notifications (info/warning/success/danger)
- **Atlassian-style task cards** — raised surface, left accent stripe by status
- **Atlassian empty states** — heading + description + primary action
- **Sticky header** for task list
- **Atlassian motion tokens** — duration + easing for all animations
- **Responsive behavior** — sidebar collapse (not hamburger), stacked panels

---

## Files Affected (Phase 1)

### Core design files
- `src/app/globals.css` — complete rewrite of CSS variables, `@theme inline`, utility classes
- `src/app/layout.tsx` — font loading (Atlassian Sans + Mono), remove Plus Jakarta Sans
- `src/constants/status.ts` — replace status color system
- `src/constants/design-system.ts` — align with new token values

### shadcn/ui components (all in `src/components/ui/`)
- `button.tsx`, `input.tsx`, `dialog.tsx`, `badge.tsx`, `card.tsx`, `spinner.tsx`
- `separator.tsx`, `label.tsx`, `tooltip.tsx`, `tabs.tsx` (if exists), and all others

### App components
- `src/components/task/` — EnhancedCard, Buttons/TaskDetails, Buttons/CompleteTask, Status, all task components
- `src/components/shared/` — EmptyState, animations, skeletons
- `src/components/auth/` — login/register forms
- `src/components/dashboard/` — DashboardTopBar, layout components
- `src/components/editor/` — editor theme CSS

### Not changed in Phase 1
- Database schema, Server Actions, API logic, authentication
- Page routing structure (that's Phase 2)
