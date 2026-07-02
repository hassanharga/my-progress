# Atlassian Design System Migration — Phase 1 (Token Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the My Progress app from its emerald/teal OKLCH palette to the Atlassian Design System (ADS) token structure — full namespace migration with Atlassian's exact token names, component recipes, typography, spacing, radius, and elevation.

**Architecture:** Replace all CSS variables in `globals.css` with Atlassian's hex-based token system (light + dark). Map every token to Tailwind v4 via `@theme inline`. Update all 27 shadcn/ui components and all app components to use the new token names. Switch fonts to Atlassian Sans + Mono. Rewrite status colors with ADS semantic roles.

**Tech Stack:** Next.js 16, Tailwind CSS v4 (CSS-first), shadcn/ui (new-york), next-themes, class-variance-authority

---

## File Structure

### Core design files (modified)
- `src/app/globals.css` — complete rewrite: CSS variables, @theme inline, utility classes, base layer
- `src/app/layout.tsx` — font loading switch (Atlassian Sans + Mono)
- `src/constants/status.ts` — rewrite status color system
- `src/constants/design-system.ts` — align constants with new scale

### shadcn/ui components (all 27 files in `src/components/ui/`)
Every file gets token name updates. The heaviest changes are: `button.tsx`, `badge.tsx`, `input.tsx`, `dialog.tsx`, `card.tsx`. The rest are mechanical find-and-replace of token names.

### App components
- `src/components/task/` — EnhancedCard, Status, TaskDetails (3 files with color changes)
- `src/components/shared/` — StatsCard, Settings, DisplayServerActionResponse, EmptyState (4 files)
- `src/components/auth/` — AuthShell (1 file)
- `src/components/dashboard/` — DashboardSidebar (1 file)
- `src/components/editor/themes/` — editor-theme.ts, editor-theme.css (2 files)

### Font files (created)
- `public/fonts/atlassian-sans-*.woff2` — Atlassian Sans font files (400, 500, 653 weights)
- `public/fonts/atlassian-mono-*.woff2` — Atlassian Mono font files (400 weight)

---

## Token Name Migration Reference

This mapping table is the single source of truth for ALL component restyling. Every old token name maps to exactly one new token name.

| Old (shadcn) | New (Atlassian) | CSS var |
|---|---|---|
| `bg-background` | `bg-surface` | `--surface` |
| `text-foreground` | `text-text` | `--text` |
| `bg-card` | `bg-surface` | `--surface` |
| `text-card-foreground` | `text-text` | `--text` |
| `bg-popover` | `bg-surface-overlay` | `--surface-overlay` |
| `text-popover-foreground` | `text-text` | `--text` |
| `bg-primary` | `bg-brand-bold` | `--background-brand-bold` |
| `text-primary` | `text-text-brand` | `--text-brand` |
| `bg-primary-foreground` | `text-text-inverse` / `bg-text-inverse` | `--text-inverse` |
| `bg-secondary` | `bg-surface-container` | `--surface-container` |
| `text-secondary-foreground` | `text-text` | `--text` |
| `bg-muted` | `bg-surface-container` | `--surface-container` |
| `text-muted-foreground` | `text-text-subtle` | `--text-subtle` |
| `bg-accent` | `bg-surface-container` | `--surface-container` |
| `text-accent-foreground` | `text-text` | `--text` |
| `bg-destructive` | `bg-danger-bold` | `--background-danger-bold` |
| `text-destructive` | `text-text-danger` | `--text-danger` |
| `bg-input` | `bg-surface` | `--surface` |
| `border-border` | `border-border` | `--border` (same name) |
| `border-input` | `border-border-input` | `--border-input` |
| `border-ring` / `ring-ring` | `border-border-focused` / `ring-border-focused` | `--border-focused` |
| `text-white` (on destructive) | `text-text-inverse` | `--text-inverse` |
| `bg-black/50` (overlays) | `bg-blanket` | `--blanket` |

---

## Task 1: Download and configure Atlassian fonts

**Files:**
- Create: `public/fonts/` directory with Atlassian Sans + Mono woff2 files
- Modify: `src/app/layout.tsx`

Atlassian Sans is based on Inter and Atlassian Mono is based on JetBrains Mono. Since no official npm package exists, we download font files from Atlassian's CDN and use `next/font/local`.

- [ ] **Step 1: Download Atlassian Sans font files**

Download the Atlassian Sans woff2 files from the Atlassian Design System CDN. We need weights 400 (regular), 500 (medium), and 653 (bold/semibold) in normal style.

```bash
mkdir -p public/fonts
cd public/fonts

# Atlassian Sans - Regular (400)
curl -L -o atlassian-sans-400.woff2 "https://atlassian.design/fonts/atlassian-sans/AtlassianSans-Regular.woff2"

# Atlassian Sans - Medium (500)
curl -L -o atlassian-sans-500.woff2 "https://atlassian.design/fonts/atlassian-sans/AtlassianSans-Medium.woff2"

# Atlassian Sans - Semibold (600)
curl -L -o atlassian-sans-600.woff2 "https://atlassian.design/fonts/atlassian-sans/AtlassianSans-SemiBold.woff2"

# Atlassian Sans - Bold (653 ≈ 700 for font files)
curl -L -o atlassian-sans-700.woff2 "https://atlassian.design/fonts/atlassian-sans/AtlassianSans-Bold.woff2"

# Atlassian Mono - Regular (400)
curl -L -o atlassian-mono-400.woff2 "https://atlassian.design/fonts/atlassian-mono/AtlassianMono-Regular.woff2"
```

If the CDN URLs don't work, use the `@jackson_nsanzimana/atlassian-fonts` npm package as fallback:
```bash
pnpm add @jackson_nsanzimana/atlassian-fonts
# Then copy font files from node_modules to public/fonts/
```

- [ ] **Step 2: Verify font files exist**

Run: `ls -la public/fonts/`
Expected: 5 woff2 files present.

- [ ] **Step 3: Update layout.tsx to use next/font/local**

Replace the `next/font/google` imports with `next/font/local`:

```tsx
import { type JSX, type ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';

import './globals.css';

import { config } from '@/config';
import ThemeProvider from '@/contexts/theme-provider';
import UserProvider from '@/contexts/user.context';
import { Toaster } from '@/components/ui/sonner';

const atlassianSans = localFont({
  src: [
    { path: '../../public/fonts/atlassian-sans-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/atlassian-sans-500.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/atlassian-sans-600.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/atlassian-sans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-atlassian-sans',
  display: 'swap',
});

const atlassianMono = localFont({
  src: [{ path: '../../public/fonts/atlassian-mono-400.woff2', weight: '400', style: 'normal' }],
  variable: '--font-atlassian-mono',
  display: 'swap',
});
```

Update the body className (line 96):
```tsx
<body className={`${atlassianSans.variable} ${atlassianMono.variable} font-sans antialiased`}>
```

Remove the old `Inter` and `Plus_Jakarta_Sans` imports entirely.

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS (no errors)

- [ ] **Step 5: Commit**

```bash
git add public/fonts/ src/app/layout.tsx
git commit -m "feat: switch to Atlassian Sans + Mono fonts via next/font/local"
```

---

## Task 2: Rewrite globals.css — CSS variables (light theme)

**Files:**
- Modify: `src/app/globals.css` (complete rewrite of `:root` block)

This task replaces all light-theme CSS variables with Atlassian's hex values.

- [ ] **Step 1: Replace the `:root` block**

Replace the entire `:root { ... }` block (lines 46-80 in current file) with:

```css
:root {
  /* Neutrals — text */
  --text: #292A2E;
  --text-subtle: #505258;
  --text-subtlest: #6B6E76;
  --text-disabled: #080F214A;
  --text-inverse: #FFFFFF;
  --text-selected: #1868DB;
  --text-brand: #1868DB;

  /* Links */
  --link: #1868DB;
  --link-pressed: #1558BC;
  --link-visited: #803FA5;
  --link-visited-pressed: #48245D;

  /* Icons */
  --icon: #292A2E;
  --icon-subtle: #505258;
  --icon-subtlest: #6B6E76;
  --icon-disabled: #080F214A;
  --icon-inverse: #FFFFFF;
  --icon-selected: #1868DB;
  --icon-brand: #1868DB;

  /* Surfaces */
  --surface: #FFFFFF;
  --surface-sunken: #F8F8F8;
  --surface-raised: #FFFFFF;
  --surface-overlay: #FFFFFF;
  --surface-container: #F0F1F2;

  /* Borders */
  --border: #0B120E24;
  --border-bold: #7D818A;
  --border-input: #8C8F97;
  --border-focused: #4688EC;
  --border-selected: #1868DB;
  --border-disabled: #0515240F;
  --border-inverse: #FFFFFF;

  /* Backgrounds — neutral */
  --background-neutral: #0515240F;
  --background-neutral-hovered: #0B120E24;
  --background-neutral-pressed: #080F214A;
  --background-neutral-subtle: #00000000;
  --background-neutral-subtle-hovered: #0515240F;
  --background-neutral-subtle-pressed: #0B120E24;
  --background-neutral-bold: #292A2E;
  --background-neutral-bold-hovered: #3B3D42;
  --background-neutral-bold-pressed: #505258;
  --background-input: #FFFFFF;
  --background-input-hovered: #F8F8F8;
  --background-input-pressed: #FFFFFF;
  --background-disabled: #0515240F;
  --background-selected: #E9F2FE;
  --background-selected-hovered: #CFE1FD;
  --background-selected-pressed: #8FB8F6;
  --background-selected-bold: #1868DB;
  --background-selected-bold-hovered: #1558BC;
  --background-selected-bold-pressed: #123263;

  /* Brand (blue) */
  --background-brand-subtlest: #E9F2FE;
  --background-brand-subtlest-hovered: #CFE1FD;
  --background-brand-subtlest-pressed: #ADCBFB;
  --background-brand-bold: #1868DB;
  --background-brand-bold-hovered: #1558BC;
  --background-brand-bold-pressed: #144794;
  --background-brand-boldest: #1C2B42;
  --background-brand-boldest-hovered: #123263;
  --background-brand-boldest-pressed: #144794;

  /* Success (lime-green) */
  --background-success: #EFFFD6;
  --background-success-hovered: #D3F1A7;
  --background-success-pressed: #BDE97C;
  --background-success-subtler: #D3F1A7;
  --background-success-subtle: #B3DF72;
  --background-success-bold: #5B7F24;
  --background-success-bold-hovered: #4C6B1F;
  --background-success-bold-pressed: #3F5224;
  --text-success: #4C6B1F;
  --text-success-bolder: #37471F;
  --icon-success: #22A06B;
  --border-success: #22A06B;
  --border-success-subtle: #7EE2B8;

  /* Danger (red) */
  --background-danger: #FFECEB;
  --background-danger-hovered: #FFD5D2;
  --background-danger-pressed: #FFB8B2;
  --background-danger-subtler: #FFD5D2;
  --background-danger-subtle: #FD9891;
  --background-danger-bold: #C9372C;
  --background-danger-bold-hovered: #AE2E24;
  --background-danger-bold-pressed: #872821;
  --text-danger: #AE2E24;
  --text-danger-bolder: #5D1F1A;
  --icon-danger: #C9372C;
  --border-danger: #E2483D;
  --border-danger-subtle: #FD9891;

  /* Warning (orange/yellow) */
  --background-warning: #FFF5DB;
  --background-warning-hovered: #FCE4A6;
  --background-warning-pressed: #FBD779;
  --background-warning-subtler: #FCE4A6;
  --background-warning-subtle: #FBD779;
  --background-warning-bold: #FBC828;
  --background-warning-bold-hovered: #FCA700;
  --background-warning-bold-pressed: #F68909;
  --text-warning: #9E4C00;
  --text-warning-bolder: #693200;
  --text-warning-inverse: #292A2E;
  --icon-warning: #E06C00;
  --border-warning: #E06C00;
  --border-warning-subtle: #FBC828;

  /* Information (blue) */
  --background-information: #E9F2FE;
  --background-information-hovered: #CFE1FD;
  --background-information-pressed: #ADCBFB;
  --background-information-subtler: #CFE1FD;
  --background-information-bold: #1868DB;
  --text-information: #1558BC;
  --text-information-bolder: #123263;
  --icon-information: #357DE8;
  --border-information: #357DE8;
  --border-information-subtle: #8FB8F6;

  /* Discovery (purple) */
  --background-discovery: #F8EEFE;
  --background-discovery-hovered: #EED7FC;
  --background-discovery-pressed: #E3BDFA;
  --background-discovery-subtler: #EED7FC;
  --background-discovery-bold: #964AC0;
  --text-discovery: #803FA5;
  --text-discovery-bolder: #48245D;
  --icon-discovery: #AF59E1;
  --border-discovery: #AF59E1;
  --border-discovery-subtle: #D8A0F7;

  /* Interaction */
  --interaction-hovered: #00000029;
  --interaction-pressed: #00000052;

  /* Misc */
  --skeleton: #0515240F;
  --blanket: #050C1F75;

  /* Chart colors */
  --chart-categorical-1: #357DE8;
  --chart-categorical-2: #82B536;
  --chart-categorical-3: #BF63F3;
  --chart-categorical-4: #F68909;
  --chart-categorical-5: #1558BC;

  /* Radius */
  --radius: 0.5rem;

  /* Shadows */
  --shadow-raised: 0px 1px 1px #1E1F2140, 0px 0px 1px #1E1F214F;
  --shadow-overlay: 0px 8px 12px #1E1F2126, 0px 0px 1px #1E1F214F;
  --shadow-overflow: 0px 0px 8px #1E1F2129, 0px 0px 1px #1E1F211F;
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: replace light theme CSS variables with Atlassian design tokens"
```

---

## Task 3: Rewrite globals.css — Dark theme variables

**Files:**
- Modify: `src/app/globals.css` (`.dark` block)

- [ ] **Step 1: Replace the `.dark` block**

Replace the entire `.dark { ... }` block (lines 82-115 in current file) with:

```css
.dark {
  /* Neutrals — text */
  --text: #DFE1E5;
  --text-subtle: #B6B9C0;
  --text-subtlest: #8A8D94;
  --text-disabled: #FFFFFF29;
  --text-inverse: #1E1F21;
  --text-selected: #357DE8;
  --text-brand: #357DE8;

  /* Links */
  --link: #357DE8;
  --link-pressed: #6AA1ED;
  --link-visited: #BF63F3;
  --link-visited-pressed: #D8A0F7;

  /* Icons */
  --icon: #DFE1E5;
  --icon-subtle: #B6B9C0;
  --icon-subtlest: #8A8D94;
  --icon-disabled: #FFFFFF29;
  --icon-inverse: #1E1F21;
  --icon-selected: #357DE8;
  --icon-brand: #357DE8;

  /* Surfaces */
  --surface: #1E1F21;
  --surface-sunken: #161719;
  --surface-raised: #2B2D31;
  --surface-overlay: #2B2D31;
  --surface-container: #161719;

  /* Borders */
  --border: #FFFFFF1F;
  --border-bold: #B7B9BE;
  --border-input: #7D818A;
  --border-focused: #4688EC;
  --border-selected: #357DE8;
  --border-disabled: #FFFFFF0F;
  --border-inverse: #1E1F21;

  /* Backgrounds — neutral */
  --background-neutral: #FFFFFF0F;
  --background-neutral-hovered: #FFFFFF1F;
  --background-neutral-pressed: #FFFFFF29;
  --background-neutral-subtle: #00000000;
  --background-neutral-subtle-hovered: #FFFFFF0F;
  --background-neutral-subtle-pressed: #FFFFFF1F;
  --background-neutral-bold: #DFE1E5;
  --background-neutral-bold-hovered: #E1E2E5;
  --background-neutral-bold-pressed: #CCCCCE;
  --background-input: #1E1F21;
  --background-input-hovered: #2B2D31;
  --background-input-pressed: #1E1F21;
  --background-disabled: #FFFFFF0F;
  --background-selected: #0F2D5C;
  --background-selected-hovered: #0D2447;
  --background-selected-pressed: #0A1B35;
  --background-selected-bold: #1868DB;
  --background-selected-bold-hovered: #1558BC;
  --background-selected-bold-pressed: #144794;

  /* Brand (blue) */
  --background-brand-subtlest: #0F2D5C;
  --background-brand-subtlest-hovered: #0D2447;
  --background-brand-subtlest-pressed: #0A1B35;
  --background-brand-bold: #1868DB;
  --background-brand-bold-hovered: #1558BC;
  --background-brand-bold-pressed: #144794;
  --background-brand-boldest: #0F2D5C;
  --background-brand-boldest-hovered: #0D2447;
  --background-brand-boldest-pressed: #0A1B35;

  /* Success (lime-green) */
  --background-success: #1D3E0D;
  --background-success-hovered: #2A5213;
  --background-success-pressed: #376619;
  --background-success-subtler: #2A5213;
  --background-success-subtle: #4BCE97;
  --background-success-bold: #5B7F24;
  --background-success-bold-hovered: #6A9A23;
  --background-success-bold-pressed: #82B536;
  --text-success: #B3DF72;
  --text-success-bolder: #B3DF72;
  --icon-success: #4BCE97;
  --border-success: #4BCE97;
  --border-success-subtle: #1F845A;

  /* Danger (red) */
  --background-danger: #5D1A18;
  --background-danger-hovered: #722120;
  --background-danger-pressed: #872821;
  --background-danger-subtler: #722120;
  --background-danger-subtle: #F87168;
  --background-danger-bold: #C9372C;
  --background-danger-bold-hovered: #E2483D;
  --background-danger-bold-pressed: #F15B50;
  --text-danger: #FFB8B2;
  --text-danger-bolder: #FFD5D2;
  --icon-danger: #E2483D;
  --border-danger: #E2483D;
  --border-danger-subtle: #F87168;

  /* Warning (orange/yellow) */
  --background-warning: #4A2E00;
  --background-warning-hovered: #623E03;
  --background-warning-pressed: #7A4E06;
  --background-warning-subtler: #623E03;
  --background-warning-subtle: #FBD779;
  --background-warning-bold: #FBC828;
  --background-warning-bold-hovered: #FCA700;
  --background-warning-bold-pressed: #F68909;
  --text-warning: #FBD779;
  --text-warning-bolder: #FCE4A6;
  --text-warning-inverse: #1E1F21;
  --icon-warning: #FCA700;
  --border-warning: #FCA700;
  --border-warning-subtle: #FBC828;

  /* Information (blue) */
  --background-information: #0F2D5C;
  --background-information-hovered: #0D2447;
  --background-information-pressed: #0A1B35;
  --background-information-subtler: #0D2447;
  --background-information-bold: #1868DB;
  --text-information: #357DE8;
  --text-information-bolder: #6AA1ED;
  --icon-information: #357DE8;
  --border-information: #357DE8;
  --border-information-subtle: #8FB8F6;

  /* Discovery (purple) */
  --background-discovery: #2C1E43;
  --background-discovery-hovered: #3D2A5A;
  --background-discovery-pressed: #4D3571;
  --background-discovery-subtler: #3D2A5A;
  --background-discovery-bold: #964AC0;
  --text-discovery: #D8A0F7;
  --text-discovery-bolder: #E3BDFA;
  --icon-discovery: #BF63F3;
  --border-discovery: #BF63F3;
  --border-discovery-subtle: #D8A0F7;

  /* Interaction */
  --interaction-hovered: #FFFFFF29;
  --interaction-pressed: #FFFFFF3D;

  /* Misc */
  --skeleton: #FFFFFF0F;
  --blanket: #050C1F99;

  /* Chart colors */
  --chart-categorical-1: #357DE8;
  --chart-categorical-2: #82B536;
  --chart-categorical-3: #BF63F3;
  --chart-categorical-4: #F68909;
  --chart-categorical-5: #1558BC;

  /* Shadows (stronger alpha for dark) */
  --shadow-raised: 0px 1px 1px #00000040, 0px 0px 1px #0000004F;
  --shadow-overlay: 0px 8px 12px #00000026, 0px 0px 1px #0000004F;
  --shadow-overflow: 0px 0px 8px #00000029, 0px 0px 1px #0000001F;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add dark theme Atlassian design tokens"
```

---

## Task 4: Rewrite globals.css — @theme inline + utilities + base

**Files:**
- Modify: `src/app/globals.css` (`@theme inline` block, utility classes, base layer)

This task replaces the Tailwind theme mapping, adds type scale utilities, shadow utilities, and updates the base layer.

- [ ] **Step 1: Replace the `@theme inline` block**

Replace the entire `@theme inline { ... }` block (lines 6-44 in current file) with:

```css
@theme inline {
  /* Fonts */
  --font-sans: var(--font-atlassian-sans), system-ui, sans-serif;
  --font-mono: var(--font-atlassian-mono), monospace;

  /* Neutrals — text */
  --color-text: var(--text);
  --color-text-subtle: var(--text-subtle);
  --color-text-subtlest: var(--text-subtlest);
  --color-text-disabled: var(--text-disabled);
  --color-text-inverse: var(--text-inverse);
  --color-text-selected: var(--text-selected);
  --color-text-brand: var(--text-brand);

  /* Links */
  --color-link: var(--link);
  --color-link-pressed: var(--link-pressed);

  /* Icons */
  --color-icon: var(--icon);
  --color-icon-subtle: var(--icon-subtle);
  --color-icon-subtlest: var(--icon-subtlest);
  --color-icon-inverse: var(--icon-inverse);

  /* Surfaces */
  --color-surface: var(--surface);
  --color-surface-sunken: var(--surface-sunken);
  --color-surface-raised: var(--surface-raised);
  --color-surface-overlay: var(--surface-overlay);
  --color-surface-container: var(--surface-container);

  /* Borders */
  --color-border: var(--border);
  --color-border-bold: var(--border-bold);
  --color-border-input: var(--border-input);
  --color-border-focused: var(--border-focused);
  --color-border-selected: var(--border-selected);
  --color-border-disabled: var(--border-disabled);

  /* Backgrounds — neutral */
  --color-neutral: var(--background-neutral);
  --color-neutral-hovered: var(--background-neutral-hovered);
  --color-neutral-subtle: var(--background-neutral-subtle);
  --color-neutral-subtle-hovered: var(--background-neutral-subtle-hovered);
  --color-neutral-bold: var(--background-neutral-bold);
  --color-neutral-bold-hovered: var(--background-neutral-bold-hovered);
  --color-input-bg: var(--background-input);
  --color-input-hovered: var(--background-input-hovered);
  --color-disabled: var(--background-disabled);
  --color-selected: var(--background-selected);
  --color-selected-hovered: var(--background-selected-hovered);
  --color-selected-bold: var(--background-selected-bold);

  /* Brand (blue) */
  --color-brand-subtlest: var(--background-brand-subtlest);
  --color-brand-subtlest-hovered: var(--background-brand-subtlest-hovered);
  --color-brand-bold: var(--background-brand-bold);
  --color-brand-bold-hovered: var(--background-brand-bold-hovered);
  --color-brand-bold-pressed: var(--background-brand-bold-pressed);

  /* Success */
  --color-success: var(--background-success);
  --color-success-hovered: var(--background-success-hovered);
  --color-success-subtler: var(--background-success-subtler);
  --color-success-bold: var(--background-success-bold);
  --color-success-bold-hovered: var(--background-success-bold-hovered);
  --color-text-success: var(--text-success);
  --color-text-success-bolder: var(--text-success-bolder);
  --color-icon-success: var(--icon-success);
  --color-border-success: var(--border-success);

  /* Danger */
  --color-danger: var(--background-danger);
  --color-danger-hovered: var(--background-danger-hovered);
  --color-danger-subtler: var(--background-danger-subtler);
  --color-danger-bold: var(--background-danger-bold);
  --color-danger-bold-hovered: var(--background-danger-bold-hovered);
  --color-text-danger: var(--text-danger);
  --color-text-danger-bolder: var(--text-danger-bolder);
  --color-icon-danger: var(--icon-danger);
  --color-border-danger: var(--border-danger);

  /* Warning */
  --color-warning: var(--background-warning);
  --color-warning-hovered: var(--background-warning-hovered);
  --color-warning-subtler: var(--background-warning-subtler);
  --color-warning-bold: var(--background-warning-bold);
  --color-warning-bold-hovered: var(--background-warning-bold-hovered);
  --color-text-warning: var(--text-warning);
  --color-text-warning-bolder: var(--text-warning-bolder);
  --color-text-warning-inverse: var(--text-warning-inverse);
  --color-icon-warning: var(--icon-warning);
  --color-border-warning: var(--border-warning);

  /* Information */
  --color-information: var(--background-information);
  --color-information-hovered: var(--background-information-hovered);
  --color-information-subtler: var(--background-information-subtler);
  --color-information-bold: var(--background-information-bold);
  --color-text-information: var(--text-information);
  --color-text-information-bolder: var(--text-information-bolder);
  --color-icon-information: var(--icon-information);
  --color-border-information: var(--border-information);

  /* Discovery */
  --color-discovery: var(--background-discovery);
  --color-discovery-hovered: var(--background-discovery-hovered);
  --color-discovery-subtler: var(--background-discovery-subtler);
  --color-discovery-bold: var(--background-discovery-bold);
  --color-text-discovery: var(--text-discovery);
  --color-text-discovery-bolder: var(--text-discovery-bolder);
  --color-icon-discovery: var(--icon-discovery);
  --color-border-discovery: var(--border-discovery);

  /* Interaction */
  --color-interaction-hovered: var(--interaction-hovered);
  --color-interaction-pressed: var(--interaction-pressed);

  /* Misc */
  --color-skeleton: var(--skeleton);
  --color-blanket: var(--blanket);

  /* Chart */
  --color-chart-1: var(--chart-categorical-1);
  --color-chart-2: var(--chart-categorical-2);
  --color-chart-3: var(--chart-categorical-3);
  --color-chart-4: var(--chart-categorical-4);
  --color-chart-5: var(--chart-categorical-5);

  /* Radius */
  --radius-xs: 0.125rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}
```

- [ ] **Step 2: Add type scale and shadow utility classes**

After the `@theme inline` block and before the `:root` block, add:

```css
@layer utilities {
  /* Type scale */
  .text-heading-xxlarge { font-size: 2rem; font-weight: 653; line-height: 2.25rem; }
  .text-heading-xlarge { font-size: 1.75rem; font-weight: 653; line-height: 2rem; }
  .text-heading-large { font-size: 1.5rem; font-weight: 653; line-height: 1.75rem; }
  .text-heading-medium { font-size: 1.25rem; font-weight: 653; line-height: 1.5rem; }
  .text-heading-small { font-size: 1rem; font-weight: 653; line-height: 1.25rem; }
  .text-heading-xsmall { font-size: 0.875rem; font-weight: 653; line-height: 1.25rem; }
  .text-body-large { font-size: 1rem; font-weight: 400; line-height: 1.5rem; }
  .text-body { font-size: 0.875rem; font-weight: 400; line-height: 1.25rem; }
  .text-body-small { font-size: 0.75rem; font-weight: 400; line-height: 1rem; }

  /* Font weights */
  .font-weight-regular { font-weight: 400; }
  .font-weight-medium { font-weight: 500; }
  .font-weight-semibold { font-weight: 600; }
  .font-weight-bold { font-weight: 653; }

  /* Elevation shadows */
  .shadow-raised { box-shadow: var(--shadow-raised); }
  .shadow-overlay { box-shadow: var(--shadow-overlay); }
  .shadow-overflow { box-shadow: var(--shadow-overflow); }
}
```

- [ ] **Step 3: Update the base layer**

Replace the `@layer base { ... }` block with:

```css
@layer base {
  * {
    @apply border-border outline-border-focused/50;
  }
  body {
    @apply bg-surface text-text h-screen flex;
    font-family: var(--font-atlassian-sans), system-ui, sans-serif;
  }
}
```

- [ ] **Step 4: Verify the dev server starts without errors**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add Atlassian @theme inline mapping, type scale, elevation utilities"
```

---

## Task 5: Rewrite status constants

**Files:**
- Modify: `src/constants/status.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
export const TaskStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  PAUSED: 'PAUSED',
  RESUMED: 'RESUMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const Statuses = {
  [TaskStatus.IN_PROGRESS]: 'In progress',
  [TaskStatus.PAUSED]: 'Paused',
  [TaskStatus.RESUMED]: 'In progress',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.CANCELLED]: 'Cancelled',
};

/**
 * Atlassian semantic status tokens — single source of truth.
 * Maps task statuses to Atlassian Design System semantic color roles.
 */
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

/**
 * @deprecated Use STATUS_TOKENS instead. Kept for backward compatibility during migration.
 */
export const STATUS_STYLES = STATUS_TOKENS;
```

Note: `STATUS_STYLES` is kept as an alias to avoid breaking imports in components that haven't been updated yet. It will be removed once all consumers use `STATUS_TOKENS`.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/constants/status.ts
git commit -m "feat: replace status colors with Atlassian semantic tokens"
```

---

## Task 6: Restyle Button component

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Replace the buttonVariants cva**

Replace the entire `buttonVariants` definition (lines 7-39) with:

```typescript
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-075 rounded-md text-body font-weight-medium whitespace-nowrap transition-all outline-none focus-visible:border-border-focused focus-visible:ring-[3px] focus-visible:ring-border-focused/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-bold text-text-inverse hover:bg-brand-bold-hovered active:bg-brand-bold-pressed",
        default:
          "bg-neutral-subtle text-text-subtle border border-border hover:bg-neutral-subtle-hovered",
        subtle:
          "bg-neutral-subtle text-text-subtle hover:bg-neutral-subtle-hovered",
        danger:
          "bg-danger-bold text-text-inverse hover:bg-danger-bold-hovered focus-visible:ring-border-danger/20",
        warning:
          "bg-warning-bold text-text-warning-inverse hover:bg-warning-bold-hovered",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-150 py-075 has-[>svg]:px-100",
        xs: "h-6 gap-050 rounded-md px-100 text-body-small has-[>svg]:px-050 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-050 rounded-md px-100 has-[>svg]:px-075",
        lg: "h-10 rounded-md px-200 has-[>svg]:px-150",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)
```

Key changes:
- `default` variant is now `primary` (brand-bold)
- Old `outline` → `default` (neutral subtle + border)
- Old `ghost` → `subtle`
- Old `destructive` → `danger`
- Old `secondary` removed (was unused)
- New `warning` variant added
- `text-white` → `text-text-inverse`
- Spacing uses Atlassian tokens (`gap-075`, `px-150`, `py-075`)
- Font uses `text-body font-weight-medium`

- [ ] **Step 2: Update the default variant**

The `defaultVariants` already sets `variant: "primary"` in the new code. Update any component that passes `variant="default"` to pass `variant="primary"` instead — but since we renamed `default` to `primary` and kept `default` as the outline-like variant, check if any callers explicitly use `variant="default"`.

Run: `rg 'variant="default"' src/components/` to find callers.
- If callers use `<Button>` without a variant prop, they'll now get `primary` (correct — was `default` = primary before).
- If callers use `variant="outline"`, change to `variant="default"`.
- If callers use `variant="ghost"`, change to `variant="subtle"`.
- If callers use `variant="destructive"`, change to `variant="danger"`.
- If callers use `variant="secondary"`, change to `variant="default"`.

- [ ] **Step 3: Fix all callers**

Search and update all `<Button` usages across the codebase:

```bash
# Find outline buttons
rg 'variant="outline"' src/components/ -l
# Find ghost buttons
rg 'variant="ghost"' src/components/ -l
# Find destructive buttons
rg 'variant="destructive"' src/components/ -l
# Find secondary buttons
rg 'variant="secondary"' src/components/ -l
```

Update each file:
- `variant="outline"` → `variant="default"`
- `variant="ghost"` → `variant="subtle"`
- `variant="destructive"` → `variant="danger"`
- `variant="secondary"` → `variant="default"`

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/components/
git commit -m "feat: restyle Button with Atlassian button recipes"
```

---

## Task 7: Restyle Badge component

**Files:**
- Modify: `src/components/ui/badge.tsx`

- [ ] **Step 1: Replace the badgeVariants cva**

Replace the entire `badgeVariants` definition (lines 7-27) with:

```typescript
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-050 overflow-hidden rounded-xs border border-transparent px-050 text-body-small font-weight-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-neutral text-text [a&]:hover:bg-neutral-hovered",
        primary: "bg-brand-subtlest text-text-brand [a&]:hover:bg-brand-subtlest-hovered",
        success: "bg-success-subtler text-text-success-bolder [a&]:hover:bg-success-hovered",
        warning: "bg-warning-subtler text-text-warning-bolder [a&]:hover:bg-warning-hovered",
        danger: "bg-danger-subtler text-text-danger-bolder [a&]:hover:bg-danger-hovered",
        information: "bg-information-subtler text-text-information-bolder [a&]:hover:bg-information-hovered",
        discovery: "bg-discovery-subtler text-text-discovery-bolder [a&]:hover:bg-discovery-hovered",
        outline: "border-border text-text [a&]:hover:bg-neutral [a&]:hover:text-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

Key changes:
- Radius: `rounded-full` → `rounded-xs` (Atlassian badge uses xsmall radius)
- Padding: `px-2 py-0.5` → `px-050`
- Font: `text-xs` → `text-body-small`
- Semantic variants added: `success`, `warning`, `danger`, `information`, `discovery`
- Old `destructive` → `danger`
- Old `secondary` → `default`
- Old `ghost` → removed
- Old `link` → removed

- [ ] **Step 2: Fix all Badge callers**

Search for callers using old variant names:
```bash
rg 'variant="(destructive|secondary|ghost|link)"' src/components/ --include="*.tsx" -l
```

Update each file:
- `variant="destructive"` → `variant="danger"`
- `variant="secondary"` → `variant="default"`
- Remove `variant="ghost"` and `variant="link"` (or map to `variant="default"`)

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/badge.tsx src/components/
git commit -m "feat: restyle Badge with Atlassian badge recipes"
```

---

## Task 8: Restyle Input component

**Files:**
- Modify: `src/components/ui/input.tsx`

- [ ] **Step 1: Read current input.tsx**

Run: Read `src/components/ui/input.tsx` to see the current implementation.

- [ ] **Step 2: Replace token classes**

Replace these class strings in the input component:
- `border-input` → `border-border-input`
- `bg-input` → `bg-surface`
- `bg-transparent` stays as-is
- `text-foreground` → `text-text`
- `text-muted-foreground` → `text-text-subtlest` (placeholder color)
- `border-destructive` → `border-border-danger`
- `ring-destructive` → `ring-border-danger`
- `focus-visible:border-ring` → `focus-visible:border-border-focused`
- `focus-visible:ring-ring` → `focus-visible:ring-border-focused`
- `aria-invalid:border-destructive` → `aria-invalid:border-border-danger`
- `aria-invalid:ring-destructive` → `aria-invalid:ring-border-danger`

The base cva string should become:

```typescript
"flex h-9 w-full min-w-0 rounded-md border border-border-input bg-surface px-075 py-075 text-body text-text shadow-xs transition-[color,box-shadow] outline-none placeholder:text-text-subtlest disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body file:font-weight-medium selection:bg-selected selection:text-text-selected focus-visible:border-border-focused focus-visible:ring-[3px] focus-visible:ring-border-focused/50 aria-invalid:border-border-danger aria-invalid:ring-border-danger/20 dark:aria-invalid:ring-border-danger/40"
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat: restyle Input with Atlassian text field recipe"
```

---

## Task 9: Restyle Dialog component

**Files:**
- Modify: `src/components/ui/dialog.tsx`

- [ ] **Step 1: Read current dialog.tsx**

Run: Read `src/components/ui/dialog.tsx`.

- [ ] **Step 2: Replace token classes in the file**

Apply these replacements throughout dialog.tsx:
- `bg-black/50` → `bg-blanket` (overlay backdrop)
- `bg-accent` → `bg-neutral-subtle-hovered`
- `text-accent-foreground` → `text-text`
- `text-muted-foreground` → `text-text-subtle`
- `bg-background` → `bg-surface-overlay`
- `bg-popover` → `bg-surface-overlay`

For `DialogContent`, the className should include `shadow-overlay` and `rounded-xl`:
The current `data-[state=open]:animate-in` etc. stay. Just swap the color/shadow tokens.

For `DialogTitle`, change to use `text-heading-medium font-weight-bold`.
For `DialogDescription`, use `text-text-subtle`.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat: restyle Dialog with Atlassian overlay recipe"
```

---

## Task 10: Restyle Card component

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: Read current card.tsx**

Run: Read `src/components/ui/card.tsx`.

- [ ] **Step 2: Replace token classes**

- `bg-card` → `bg-surface`
- `text-card-foreground` → `text-text`
- `text-muted-foreground` → `text-text-subtle`
- `bg-primary` → `bg-brand-bold`
- `text-primary` → `text-text-brand`

The Card base should be `bg-surface border-border rounded-lg` (no shadow by default).

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat: restyle Card with Atlassian surface recipe"
```

---

## Task 11: Restyle remaining UI components (batch)

**Files:**
- Modify: All remaining files in `src/components/ui/`

This task applies the token name migration to the remaining 20 shadcn components. Each file gets a mechanical find-and-replace using the mapping table.

- [ ] **Step 1: Apply token replacements to all remaining ui/ files**

For each file in `src/components/ui/` EXCEPT button.tsx, badge.tsx, input.tsx, dialog.tsx, card.tsx (already done), apply these replacements:

```
text-foreground          → text-text
text-muted-foreground    → text-text-subtle
text-primary             → text-text-brand
text-primary-foreground  → text-text-inverse
text-secondary-foreground → text-text
text-accent-foreground   → text-text
text-destructive         → text-text-danger
text-white               → text-text-inverse
text-background          → text-surface

bg-background            → bg-surface
bg-card                  → bg-surface
bg-popover               → bg-surface-overlay
bg-primary               → bg-brand-bold
bg-primary-foreground    → bg-text-inverse
bg-secondary             → bg-surface-container
bg-muted                 → bg-surface-container
bg-accent                → bg-surface-container
bg-destructive           → bg-danger-bold
bg-input                 → bg-surface
bg-black/50              → bg-blanket
bg-black/80              → bg-blanket

border-input             → border-border-input
border-ring              → border-border-focused
border-destructive       → border-border-danger
border-primary           → border-border-selected

ring-ring                → ring-border-focused
ring-destructive         → ring-border-danger

fill-foreground          → fill-text
```

Files to process (20 files):
1. `accordion.tsx`
2. `alert.tsx`
3. `avatar.tsx`
4. `button-group.tsx`
5. `command.tsx`
6. `drawer.tsx`
7. `dropdown-menu.tsx`
8. `label.tsx`
9. `pagination.tsx`
10. `popover.tsx`
11. `progress.tsx`
12. `select.tsx`
13. `separator.tsx`
14. `sheet.tsx`
15. `skeleton.tsx`
16. `sonner.tsx`
17. `spinner.tsx` (update color to `text-icon-subtle`)
18. `table.tsx`
19. `tabs.tsx`
20. `toggle.tsx` and `toggle-group.tsx`
21. `tooltip.tsx`

Use `sd` (sed alternative) for batch replacement:

```bash
cd /Users/hharga/Work/my-progress

for file in src/components/ui/accordion.tsx src/components/ui/alert.tsx src/components/ui/avatar.tsx src/components/ui/button-group.tsx src/components/ui/command.tsx src/components/ui/drawer.tsx src/components/ui/dropdown-menu.tsx src/components/ui/label.tsx src/components/ui/pagination.tsx src/components/ui/popover.tsx src/components/ui/progress.tsx src/components/ui/select.tsx src/components/ui/separator.tsx src/components/ui/sheet.tsx src/components/ui/skeleton.tsx src/components/ui/sonner.tsx src/components/ui/table.tsx src/components/ui/tabs.tsx src/components/ui/toggle.tsx src/components/ui/toggle-group.tsx src/components/ui/tooltip.tsx; do
  sd 'text-foreground' 'text-text' "$file"
  sd 'text-muted-foreground' 'text-text-subtle' "$file"
  sd 'text-primary-foreground' 'text-text-inverse' "$file"
  sd 'text-primary' 'text-text-brand' "$file"
  sd 'text-secondary-foreground' 'text-text' "$file"
  sd 'text-accent-foreground' 'text-text' "$file"
  sd 'text-destructive' 'text-text-danger' "$file"
  sd 'text-white' 'text-text-inverse' "$file"
  sd 'bg-background' 'bg-surface' "$file"
  sd 'bg-card' 'bg-surface' "$file"
  sd 'bg-popover' 'bg-surface-overlay' "$file"
  sd 'bg-primary-foreground' 'bg-text-inverse' "$file"
  sd 'bg-primary' 'bg-brand-bold' "$file"
  sd 'bg-secondary' 'bg-surface-container' "$file"
  sd 'bg-muted' 'bg-surface-container' "$file"
  sd 'bg-accent' 'bg-surface-container' "$file"
  sd 'bg-destructive' 'bg-danger-bold' "$file"
  sd 'bg-input' 'bg-surface' "$file"
  sd 'bg-black/50' 'bg-blanket' "$file"
  sd 'bg-black/80' 'bg-blanket' "$file"
  sd 'border-input' 'border-border-input' "$file"
  sd 'border-ring' 'border-border-focused' "$file"
  sd 'border-destructive' 'border-border-danger' "$file"
  sd 'border-primary' 'border-border-selected' "$file"
  sd 'ring-ring' 'ring-border-focused' "$file"
  sd 'ring-destructive' 'ring-border-danger' "$file"
  sd 'fill-foreground' 'fill-text' "$file"
done
```

Also manually update spinner.tsx to use `text-icon-subtle` as its color.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Verify lint**

Run: `pnpm lint`
Expected: PASS (fix any issues)

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/
git commit -m "feat: migrate all remaining UI components to Atlassian tokens"
```

---

## Task 12: Update app components — Task

**Files:**
- Modify: `src/components/task/EnhancedCard.tsx`
- Modify: `src/components/task/Buttons/TaskDetails.tsx`
- Modify: `src/components/task/index.tsx`
- Modify: `src/components/shared/Status.tsx`

- [ ] **Step 1: Migrate token names in task components**

Apply the same token replacement mapping from Task 11 to all task component files:

```bash
for file in src/components/task/EnhancedCard.tsx src/components/task/Buttons/TaskDetails.tsx src/components/task/Buttons/CompleteTask.tsx src/components/task/Buttons/CreateTask.tsx src/components/task/index.tsx src/components/task/List.tsx; do
  sd 'text-foreground' 'text-text' "$file"
  sd 'text-muted-foreground' 'text-text-subtle' "$file"
  sd 'text-primary-foreground' 'text-text-inverse' "$file"
  sd 'text-primary' 'text-text-brand' "$file"
  sd 'bg-primary' 'bg-brand-bold' "$file"
  sd 'bg-secondary' 'bg-surface-container' "$file"
  sd 'border-primary' 'border-border-selected' "$file"
done
```

- [ ] **Step 2: Fix hardcoded colors in EnhancedCard.tsx**

In `src/components/task/EnhancedCard.tsx`, replace:
- `text-red-600` → `text-text-danger` (line ~97, delete menu item)

- [ ] **Step 3: Update STATUS_STYLES references**

In any component that imports `STATUS_STYLES`, update to import `STATUS_TOKENS` instead. Check:
```bash
rg 'STATUS_STYLES' src/components/ -l
```

Update imports: `import { STATUS_STYLES } from '@/constants/status'` → `import { STATUS_TOKENS } from '@/constants/status'`
Update usages: `STATUS_STYLES[...]` → `STATUS_TOKENS[...]`

- [ ] **Step 4: Update Status.tsx**

Read `src/components/shared/Status.tsx` and update it to use `STATUS_TOKENS`. If it uses `StatusColors` (legacy hex), remove that import entirely and use the token-based system.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/task/ src/components/shared/Status.tsx
git commit -m "feat: migrate task components to Atlassian tokens"
```

---

## Task 13: Update app components — Shared

**Files:**
- Modify: `src/components/shared/StatsCard.tsx`
- Modify: `src/components/shared/Settings.tsx`
- Modify: `src/components/shared/DisplayServerActionResponse.tsx`
- Modify: `src/components/shared/EmptyState.tsx`
- Modify: `src/components/shared/Table.tsx`
- Modify: `src/components/shared/skeletons/TaskCardSkeleton.tsx`

- [ ] **Step 1: Apply token name migrations to all shared components**

```bash
for file in src/components/shared/StatsCard.tsx src/components/shared/Settings.tsx src/components/shared/DisplayServerActionResponse.tsx src/components/shared/EmptyState.tsx src/components/shared/Table.tsx src/components/shared/skeletons/TaskCardSkeleton.tsx src/components/shared/skeletons/DashboardSkeleton.tsx src/components/shared/Pagination.tsx; do
  sd 'text-foreground' 'text-text' "$file"
  sd 'text-muted-foreground' 'text-text-subtle' "$file"
  sd 'text-primary-foreground' 'text-text-inverse' "$file"
  sd 'text-primary' 'text-text-brand' "$file"
  sd 'bg-primary' 'bg-brand-bold' "$file"
  sd 'bg-muted' 'bg-surface-container' "$file"
  sd 'bg-secondary' 'bg-surface-container' "$file"
  sd 'bg-accent' 'bg-surface-container' "$file"
done
```

- [ ] **Step 2: Fix hardcoded colors**

- `src/components/shared/StatsCard.tsx`: `text-emerald-600` → `text-text-success-bolder`, `text-red-600` → `text-text-danger`
- `src/components/shared/Settings.tsx`: `text-rose-700` → `text-text-danger` (2 occurrences)
- `src/components/shared/DisplayServerActionResponse.tsx`: `text-red-500` → `text-text-danger`

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/
git commit -m "feat: migrate shared components to Atlassian tokens"
```

---

## Task 14: Update app components — Auth & Dashboard

**Files:**
- Modify: `src/components/auth/AuthShell.tsx`
- Modify: `src/components/auth/login.tsx`
- Modify: `src/components/auth/register.tsx`
- Modify: `src/components/dashboard/DashboardSidebar.tsx`
- Modify: `src/components/dashboard/DashboardTopBar.tsx`
- Modify: `src/components/dashboard/DashboardShell.tsx`

- [ ] **Step 1: Apply token migrations**

```bash
for file in src/components/auth/AuthShell.tsx src/components/auth/login.tsx src/components/auth/register.tsx src/components/dashboard/DashboardSidebar.tsx src/components/dashboard/DashboardTopBar.tsx src/components/dashboard/DashboardShell.tsx; do
  sd 'text-foreground' 'text-text' "$file"
  sd 'text-muted-foreground' 'text-text-subtle' "$file"
  sd 'text-primary-foreground' 'text-text-inverse' "$file"
  sd 'text-primary' 'text-text-brand' "$file"
  sd 'text-destructive' 'text-text-danger' "$file"
  sd 'bg-primary' 'bg-brand-bold' "$file"
  sd 'bg-muted' 'bg-surface-container' "$file"
  sd 'bg-background' 'bg-surface' "$file"
  sd 'bg-secondary' 'bg-surface-container' "$file"
  sd 'bg-accent' 'bg-surface-container' "$file"
  sd 'bg-destructive' 'bg-danger-bold' "$file"
  sd 'border-primary' 'border-border-selected' "$file"
  sd 'border-input' 'border-border-input' "$file"
done
```

- [ ] **Step 2: Fix hardcoded colors in AuthShell.tsx**

In `src/components/auth/AuthShell.tsx`:
- `bg-white/20` → keep as-is (intentional gradient overlay on colored background)
- `text-white` → `text-text-inverse`
- `bg-white/15` → keep as-is (intentional gradient overlay)

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/ src/components/dashboard/
git commit -m "feat: migrate auth and dashboard components to Atlassian tokens"
```

---

## Task 15: Update editor theme

**Files:**
- Modify: `src/components/editor/themes/editor-theme.ts`
- Modify: `src/components/editor/themes/editor-theme.css`

- [ ] **Step 1: Migrate token names in editor-theme.ts**

```bash
cd /Users/hharga/Work/my-progress

sd 'text-foreground' 'text-text' src/components/editor/themes/editor-theme.ts
sd 'text-muted-foreground' 'text-text-subtle' src/components/editor/themes/editor-theme.ts
sd 'text-primary' 'text-text-brand' src/components/editor/themes/editor-theme.ts
sd 'bg-primary' 'bg-brand-bold' src/components/editor/themes/editor-theme.ts
sd 'border-primary' 'border-border-selected' src/components/editor/themes/editor-theme.ts
sd 'bg-muted' 'bg-surface-container' src/components/editor/themes/editor-theme.ts
sd 'bg-background' 'bg-surface' src/components/editor/themes/editor-theme.ts
sd 'bg-destructive' 'bg-danger-bold' src/components/editor/themes/editor-theme.ts
sd 'border-white' 'border-border-inverse' src/components/editor/themes/editor-theme.ts
```

- [ ] **Step 2: Add CSS variable references to editor-theme.css**

In `src/components/editor/themes/editor-theme.css`, the PrismJS syntax highlighting hex colors (`#ccc`, `#777`, etc.) should remain for now — they are code syntax colors, not UI tokens. Only update the `var(--background)` reference:

```bash
sd 'var(--background)' 'var(--surface)' src/components/editor/themes/editor-theme.css
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/themes/
git commit -m "feat: migrate editor theme to Atlassian tokens"
```

---

## Task 16: Update design-system constants

**Files:**
- Modify: `src/constants/design-system.ts`

- [ ] **Step 1: Read and update the file**

Read `src/constants/design-system.ts` and update:
- `borderRadius` values to match the new CSS token scale: `sm: '0.25rem'`, `md: '0.375rem'`, `lg: '0.5rem'`, `xl: '0.75rem'`
- `shadows` to include the three Atlassian shadow names: `raised`, `overlay`, `overflow`
- `animations.durations` to align with Atlassian motion: `xxshort: '50ms'`, `xshort: '100ms'`, `short: '150ms'`, `medium: '200ms'`, `long: '250ms'`, `xlong: '400ms'`, `xxlong: '600ms'`
- `animations.easings` to use Atlassian easing names

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/constants/design-system.ts
git commit -m "feat: align design-system constants with Atlassian scale"
```

---

## Task 17: Apply sentence case to all user-visible text

**Files:**
- All component files with user-visible text (buttons, dialogs, labels, etc.)

- [ ] **Step 1: Find Title Case strings**

Search for common Title Case patterns in button labels, dialog titles, and headings:

```bash
rg '"[A-Z][a-z]+ [A-Z]' src/components/ --include="*.tsx" | rg -v 'className|import|export|const|type|interface|SVG|Props'
```

- [ ] **Step 2: Fix Title Case → sentence case**

Common fixes to apply across all components:
- "Edit Task" → "Edit task"
- "Task details" → already sentence case
- "Save Changes" → "Save changes"
- "Create Task" → "Create task"
- "Total Time" → "Total time"
- "Next Steps" → "Next steps"
- "Completed" → already sentence case
- "In Progress" → "In progress"

Also update the `Statuses` map in `src/constants/status.ts` if RESUMED still says "Resumed" — it should say "In progress" (already handled in Task 5).

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ src/constants/
git commit -m "feat: apply sentence case to all user-visible text"
```

---

## Task 18: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS with zero errors

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (fix any issues found)

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3b: Check for font-display usage**

The `--font-display` CSS variable (Plus Jakarta Sans) was removed. Search for any component using `font-display`:

```bash
rg 'font-display' src/ --include="*.tsx" --include="*.ts" --include="*.css"
```

If found, replace `font-display` with `font-sans` or a type scale class like `text-heading-medium`.

- [ ] **Step 4: Check for remaining old token references**

Search for any remaining old token names that were missed:

```bash
rg 'bg-primary|text-primary|bg-muted|text-muted-foreground|bg-secondary|text-secondary-foreground|bg-accent|text-accent-foreground|bg-destructive|text-destructive|bg-card|text-card-foreground|bg-popover|text-popover-foreground|bg-background|text-foreground' src/components/ src/app/ --include="*.tsx" --include="*.ts" --include="*.css"
```

Expected: No matches (or only matches inside comments/deprecated code). Fix any remaining references.

- [ ] **Step 5: Check for remaining hardcoded palette colors**

```bash
rg 'text-(red|green|blue|amber|emerald|rose|yellow|orange|purple|teal)-[0-9]' src/components/ --include="*.tsx"
```

Expected: No matches. Fix any remaining hardcoded colors.

- [ ] **Step 6: Start dev server and visually verify**

Run: `pnpm dev`
Open: `http://localhost:3000`

Verify:
- Light mode: neutral background, blue brand color, semantic status badges
- Dark mode: dark surface, readable text, adjusted semantic colors
- Buttons render with correct variants
- Dialog/modal has overlay shadow and correct padding
- Status badges use semantic colors (blue=active, orange=paused, lime=completed, red=cancelled)
- Fonts: Atlassian Sans for all text, Atlassian Mono for code

- [ ] **Step 7: Final commit if any fixes were made**

```bash
git add -A
git commit -m "fix: final Atlassian token migration cleanup"
```

---

## Post-Migration Notes

- The `STATUS_STYLES` alias in status.ts can be removed once all consumers are confirmed to use `STATUS_TOKENS`.
- The `StatusColors` export has been removed entirely — verify no external code references it.
- Phase 2 (layout restructuring) is a separate plan that will be created after Phase 1 is verified.
- The PrismJS syntax highlighting colors in editor-theme.css are intentionally left as hex — they are code syntax tokens, not UI design tokens.
