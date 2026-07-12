# Top Bar Consolidation & Color Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the sidebar (moving its content to the top bar), fix primary button contrast in dark mode, improve status badge colors, and apply frontend-design fixes across the whole app.

**Architecture:** CSS token changes in globals.css, component-level changes in dashboard/landing/auth components, extraction of ProjectSwitcher to its own file, and deletion of DashboardSidebar.

**Tech Stack:** Next.js 16, Tailwind CSS 4, Atlassian Design System tokens, Framer Motion, next-safe-action

**Spec:** `docs/superpowers/specs/2026-07-12-topbar-consolidation-and-color-fixes-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/globals.css` | Modify | Dark mode button fix, font var rename, display tier, body font-family |
| `src/app/layout.tsx` | Modify | Font variable rename |
| `src/constants/status.ts` | Modify | Status badge token classes |
| `src/components/editor/themes/editor-theme.css` | Modify | Replace raw hex with ADS tokens |
| `src/components/landing/CTA.tsx` | Modify | Fix broken gradient + typography |
| `src/components/landing/Hero.tsx` | Modify | Typography unification |
| `src/components/landing/Features.tsx` | Modify | Typography unification |
| `src/components/landing/HowItWorks.tsx` | Modify | Typography unification |
| `src/components/landing/Showcase.tsx` | Modify | Typography unification |
| `src/components/landing/FAQ.tsx` | Modify | Typography unification |
| `src/components/landing/Footer.tsx` | Modify | Typography unification |
| `src/components/landing/Navbar.tsx` | Modify | Typography unification |
| `src/components/landing/AnimatedProductPreview.tsx` | Modify | Typography unification + fix `fill-primary` |
| `src/components/auth/login.tsx` | Modify | Typography unification |
| `src/components/auth/register.tsx` | Modify | Typography unification |
| `src/components/auth/AuthShell.tsx` | Modify | Fix `text-sm` → `text-body` |
| `src/components/shared/skeletons/TaskCardSkeleton.tsx` | Modify | Align to TaskCardRow layout |
| `src/components/shared/skeletons/DashboardSkeleton.tsx` | Modify | Remove sidebar skeleton, update top bar skeleton |
| `src/components/dashboard/ProjectSwitcher.tsx` | Create | Extracted compact project switcher |
| `src/components/dashboard/DashboardTopBar.tsx` | Modify | Absorb logo, project switcher, settings |
| `src/components/dashboard/DashboardShell.tsx` | Modify | Remove sidebar, simplify |
| `src/components/dashboard/DashboardSidebar.tsx` | Delete | No longer needed |

---

### Task 1: CSS Foundations (globals.css + layout.tsx)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

This task covers: dark mode button fix (Section 2), font variable rename (Section 4.1), display tier addition (Section 4.2), and body font-family fix.

- [ ] **Step 1: Fix dark mode brand-bold and inverse text in globals.css**

In the `.dark` block of `src/app/globals.css`, change these 5 values:

Find (line ~407-409):
```css
  --background-brand-bold: #1868DB;
  --background-brand-bold-hovered: #1558BC;
  --background-brand-bold-pressed: #144794;
```
Replace with:
```css
  --background-brand-bold: #357DE8;
  --background-brand-bold-hovered: #1868DB;
  --background-brand-bold-pressed: #1558BC;
```

Find (line ~347):
```css
  --text-inverse: #1E1F21;
```
Replace with:
```css
  --text-inverse: #FFFFFF;
```

Find (line ~362):
```css
  --icon-inverse: #1E1F21;
```
Replace with:
```css
  --icon-inverse: #FFFFFF;
```

- [ ] **Step 2: Rename font variables in layout.tsx**

In `src/app/layout.tsx`:

Find (line 15):
```typescript
  variable: '--font-atlassian-sans',
```
Replace with:
```typescript
  variable: '--font-inter',
```

Find (line 21):
```typescript
  variable: '--font-atlassian-mono',
```
Replace with:
```typescript
  variable: '--font-jetbrains-mono',
```

- [ ] **Step 3: Update font variable references in globals.css**

In `src/app/globals.css`:

Find (line 8):
```css
  --font-sans: var(--font-atlassian-sans), system-ui, sans-serif;
```
Replace with:
```css
  --font-sans: var(--font-inter), system-ui, sans-serif;
```

Find (line 9):
```css
  --font-mono: var(--font-atlassian-mono), monospace;
```
Replace with:
```css
  --font-mono: var(--font-jetbrains-mono), monospace;
```

Find (line 503):
```css
    font-family: var(--font-atlassian-sans), system-ui, sans-serif;
```
Replace with:
```css
    font-family: var(--font-sans);
```

- [ ] **Step 4: Add display tier and body-xl to type scale**

In `src/app/globals.css`, after line 160 (`.text-heading-xxlarge`), add:

```css
  /* Display tier */
  .text-display-large  { font-size: 3.75rem; font-weight: 653; line-height: 4rem; }
  .text-display        { font-size: 3rem; font-weight: 653; line-height: 3.25rem; }
  .text-display-small  { font-size: 2.25rem; font-weight: 653; line-height: 2.5rem; }
```

After line 166 (`.text-body-large`), add:

```css
  .text-body-xl { font-size: 1.125rem; font-weight: 400; line-height: 1.75rem; }
```

- [ ] **Step 5: Verify no references to old font vars remain**

Run: `rg "font-atlassian" src/`
Expected: No output (zero matches)

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS (no errors)

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "fix: dark mode button contrast, rename font vars, add display type tier"
```

---

### Task 2: Status Badge Tokens (status.ts)

**Files:**
- Modify: `src/constants/status.ts`

- [ ] **Step 1: Update STATUS_TOKENS badge classes**

In `src/constants/status.ts`, replace the `badge` property for each status:

Find (lines 19-20):
```typescript
    badge: 'bg-information text-text-information border-border-information',
```
Replace with:
```typescript
    badge: 'bg-information-subtler text-text-information-bolder border-border-information',
```
(This appears twice — for IN_PROGRESS and RESUMED. Replace both.)

Find (line 29):
```typescript
    badge: 'bg-warning text-text-warning border-border-warning',
```
Replace with:
```typescript
    badge: 'bg-warning-subtler text-text-warning-bolder border-border-warning',
```

Find (line 34):
```typescript
    badge: 'bg-success text-text-success-bolder border-border-success',
```
Replace with:
```typescript
    badge: 'bg-success-subtler text-text-success-bolder border-border-success',
```

Find (line 39):
```typescript
    badge: 'bg-danger text-text-danger border-border-danger',
```
Replace with:
```typescript
    badge: 'bg-danger-subtler text-text-danger-bolder border-border-danger',
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/constants/status.ts
git commit -m "fix: use subtler backgrounds and bolder text for status badges"
```

---

### Task 3: Editor Theme Integration (editor-theme.css)

**Files:**
- Modify: `src/components/editor/themes/editor-theme.css`

- [ ] **Step 1: Replace all raw hex colors with ADS tokens**

Replace the entire file content with:

```css
.EditorTheme__code {
  background-color: transparent;
  font-family: var(--font-mono);
  display: block;
  padding: 8px 8px 8px 52px;
  line-height: 1.53;
  font-size: 13px;
  margin: 0;
  margin-top: 8px;
  margin-bottom: 8px;
  overflow-x: auto;
  border: 1px solid var(--border);
  position: relative;
  border-radius: 8px;
  tab-size: 2;
}
.EditorTheme__code:before {
  content: attr(data-gutter);
  position: absolute;
  background-color: transparent;
  border-right: 1px solid var(--border);
  left: 0;
  top: 0;
  padding: 8px;
  color: var(--text-subtlest);
  white-space: pre-wrap;
  text-align: right;
  min-width: 25px;
}
.EditorTheme__table {
  border-collapse: collapse;
  border-spacing: 0;
  overflow-y: scroll;
  overflow-x: scroll;
  table-layout: fixed;
  width: fit-content;
  width: 100%;
  margin: 0px 0px 30px 0px;
}
.EditorTheme__tokenComment {
  color: var(--text-subtlest);
}
.EditorTheme__tokenPunctuation {
  color: var(--text-subtle);
}
.EditorTheme__tokenProperty {
  color: var(--text-discovery-bolder);
}
.EditorTheme__tokenSelector {
  color: var(--text-success-bolder);
}
.EditorTheme__tokenOperator {
  color: var(--text-warning-bolder);
}
.EditorTheme__tokenAttr {
  color: var(--text-information);
}
.EditorTheme__tokenVariable {
  color: var(--text-warning);
}
.EditorTheme__tokenFunction {
  color: var(--text-danger);
}

.Collapsible__container {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.Collapsible__title{
  padding: 0.25rem;
  padding-left: 1rem;
  position: relative;
  font-weight: bold;
  outline: none;
  cursor: pointer;
  list-style-type: disclosure-closed;
  list-style-position: inside;
}

.Collapsible__title p{
  display: inline-flex;
}
.Collapsible__title::marker{
  color: var(--border-bold);
}
.Collapsible__container[open] >.Collapsible__title {
  list-style-type: disclosure-open;
}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/themes/editor-theme.css
git commit -m "fix: replace raw hex colors in editor theme with ADS tokens"
```

---

### Task 4: Fix CTA Gradient + Typography (CTA.tsx)

**Files:**
- Modify: `src/components/landing/CTA.tsx`

- [ ] **Step 1: Fix gradient tokens and typography**

Replace the entire file content with:

```tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { paths } from '@/paths';

export default function CTA() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-bold to-information-bold px-6 py-16 text-center">
        <h2 className="text-heading-xxlarge font-weight-bold text-text-inverse sm:text-display-small">
          Start tracking your progress today
        </h2>
        <p className="mx-auto mt-4 max-w-md text-body-large text-text-inverse/80">
          Join others who are staying on top of their work, one task at a time.
        </p>
        <Button size="lg" className="mt-8 bg-surface text-text-brand hover:bg-surface-raised" asChild>
          <Link href={paths.auth}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/CTA.tsx
git commit -m "fix: CTA gradient tokens and typography"
```

---

### Task 5: Landing Typography Unification

**Files:**
- Modify: `src/components/landing/Hero.tsx`
- Modify: `src/components/landing/Features.tsx`
- Modify: `src/components/landing/HowItWorks.tsx`
- Modify: `src/components/landing/Showcase.tsx`
- Modify: `src/components/landing/FAQ.tsx`
- Modify: `src/components/landing/Footer.tsx`
- Modify: `src/components/landing/Navbar.tsx`
- Modify: `src/components/landing/AnimatedProductPreview.tsx`

**Mapping table** (applied consistently across all files):

| Raw Tailwind | Type scale |
|---|---|
| `text-6xl` | `text-display-large` |
| `text-5xl` | `text-display` |
| `text-4xl` | `text-display-small` |
| `text-3xl` | `text-heading-xxlarge` |
| `text-2xl` | `text-heading-large` |
| `text-lg` (body) | `text-body-xl` |
| `text-lg` (heading) | `text-body-xl` + weight class |
| `text-base` | `text-body-large` |
| `text-sm` | `text-body` |
| `text-xs` | `text-body-small` |
| `text-[10px]` | `text-body-small` |
| `font-bold` | `font-weight-bold` |
| `font-semibold` | `font-weight-semibold` |
| `font-medium` | `font-weight-medium` |
| `font-sans` (redundant) | remove |

- [ ] **Step 1: Update Hero.tsx**

In `src/components/landing/Hero.tsx`:

Find:
```tsx
          <span className="text-xs font-semibold uppercase tracking-widest text-text-brand">
```
Replace with:
```tsx
          <span className="text-body-small font-weight-semibold uppercase tracking-widest text-text-brand">
```

Find:
```tsx
          <h1 className="font-sans text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
```
Replace with:
```tsx
          <h1 className="text-display-small font-weight-bold leading-tight tracking-tight sm:text-display lg:text-display-large">
```

Find:
```tsx
          <p className="max-w-md text-lg text-text-subtle">
```
Replace with:
```tsx
          <p className="max-w-md text-body-xl text-text-subtle">
```

- [ ] **Step 2: Update Features.tsx**

In `src/components/landing/Features.tsx`:

Find:
```tsx
          <span className="text-xs font-semibold uppercase tracking-widest text-text-brand">
```
Replace with:
```tsx
          <span className="text-body-small font-weight-semibold uppercase tracking-widest text-text-brand">
```

Find:
```tsx
          <h2 className="mt-2 font-sans text-3xl font-bold sm:text-4xl">
```
Replace with:
```tsx
          <h2 className="mt-2 text-heading-xxlarge font-weight-bold sm:text-display-small">
```

Find:
```tsx
              <h3 className="mb-2 font-sans text-lg font-semibold">
```
Replace with:
```tsx
              <h3 className="mb-2 text-body-xl font-weight-semibold">
```

Find:
```tsx
              <p className="text-sm text-text-subtle">
```
Replace with:
```tsx
              <p className="text-body text-text-subtle">
```

- [ ] **Step 3: Update HowItWorks.tsx**

In `src/components/landing/HowItWorks.tsx`:

Find:
```tsx
        <h2 className="mb-12 text-center font-sans text-3xl font-bold sm:text-4xl">
```
Replace with:
```tsx
        <h2 className="mb-12 text-center text-heading-xxlarge font-weight-bold sm:text-display-small">
```

Find:
```tsx
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-bold font-sans text-sm font-bold text-text-inverse">
```
Replace with:
```tsx
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-bold text-body font-weight-bold text-text-inverse">
```

Find:
```tsx
                  <h3 className="mb-2 font-sans text-lg font-semibold">
```
Replace with:
```tsx
                  <h3 className="mb-2 text-body-xl font-weight-semibold">
```

Find:
```tsx
                  <p className="text-sm text-text-subtle">
```
Replace with:
```tsx
                  <p className="text-body text-text-subtle">
```

- [ ] **Step 4: Update Showcase.tsx**

In `src/components/landing/Showcase.tsx`:

Find:
```tsx
        <h2 className="mb-12 text-center font-sans text-3xl font-bold sm:text-4xl">
```
Replace with:
```tsx
        <h2 className="mb-12 text-center text-heading-xxlarge font-weight-bold sm:text-display-small">
```

Find:
```tsx
              <p className="text-sm text-text-subtle">
```
Replace with:
```tsx
              <p className="text-body text-text-subtle">
```

Find:
```tsx
                <p className="text-2xl font-bold text-text-brand">
```
Replace with:
```tsx
                <p className="text-heading-large font-weight-bold text-text-brand">
```

Find:
```tsx
                <p className="text-xs text-text-subtle">{stat.label}</p>
```
Replace with:
```tsx
                <p className="text-body-small text-text-subtle">{stat.label}</p>
```

Find:
```tsx
                <span className="rounded-md border border-border-selected/20 bg-brand-bold/10 px-2 py-0.5 text-xs text-text-brand">
```
Replace with:
```tsx
                <span className="rounded-md border border-border-selected/20 bg-brand-bold/10 px-2 py-0.5 text-body-small text-text-brand">
```

Find:
```tsx
              <span className="font-mono text-sm tabular-nums text-text-subtle">
```
Replace with:
```tsx
              <span className="font-mono text-body tabular-nums text-text-subtle">
```

Find:
```tsx
              <span className="font-medium">Build landing page</span>
```
Replace with:
```tsx
              <span className="font-weight-medium">Build landing page</span>
```

- [ ] **Step 5: Update FAQ.tsx**

In `src/components/landing/FAQ.tsx`:

Find:
```tsx
        <h2 className="mb-8 text-center font-sans text-3xl font-bold sm:text-4xl">
```
Replace with:
```tsx
        <h2 className="mb-8 text-center text-heading-xxlarge font-weight-bold sm:text-display-small">
```

Find:
```tsx
              <AccordionTrigger className="text-left text-base font-medium">
```
Replace with:
```tsx
              <AccordionTrigger className="text-left text-body-large font-weight-medium">
```

- [ ] **Step 6: Update Footer.tsx**

In `src/components/landing/Footer.tsx`:

Find:
```tsx
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bold text-text-inverse font-sans font-bold">
```
Replace with:
```tsx
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bold text-text-inverse font-weight-bold">
```

Find:
```tsx
              <span className="font-sans text-lg font-semibold">
```
Replace with:
```tsx
              <span className="text-body-xl font-weight-semibold">
```

Find:
```tsx
            <p className="mt-3 text-sm text-text-subtle">
```
Replace with:
```tsx
            <p className="mt-3 text-body text-text-subtle">
```

Find:
```tsx
              <h4 className="text-sm font-semibold">{col.title}</h4>
```
Replace with:
```tsx
              <h4 className="text-body font-weight-semibold">{col.title}</h4>
```

Find:
```tsx
                      className="text-sm text-text-subtle transition-colors hover:text-text"
```
Replace with:
```tsx
                      className="text-body text-text-subtle transition-colors hover:text-text"
```

Find:
```tsx
          <p className="text-center text-sm text-text-subtle">
```
Replace with:
```tsx
          <p className="text-center text-body text-text-subtle">
```

- [ ] **Step 7: Update Navbar.tsx**

In `src/components/landing/Navbar.tsx`:

Find:
```tsx
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bold text-text-inverse font-sans font-bold">
```
Replace with:
```tsx
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bold text-text-inverse font-weight-bold">
```

Find:
```tsx
          <span className="font-sans text-lg font-semibold">
```
Replace with:
```tsx
          <span className="text-body-xl font-weight-semibold">
```

Find:
```tsx
              className="text-sm font-medium text-text-subtle transition-colors hover:text-text"
```
Replace with:
```tsx
              className="text-body font-weight-medium text-text-subtle transition-colors hover:text-text"
```

Find:
```tsx
                      className="text-base font-medium text-text-subtle transition-colors hover:text-text"
```
Replace with:
```tsx
                      className="text-body-large font-weight-medium text-text-subtle transition-colors hover:text-text"
```

- [ ] **Step 8: Update AnimatedProductPreview.tsx**

In `src/components/landing/AnimatedProductPreview.tsx`:

Find:
```tsx
              <Play className="h-4 w-4 fill-primary text-text-brand" />
```
Replace with:
```tsx
              <Play className="h-4 w-4 fill-brand-bold text-text-brand" />
```

Find:
```tsx
              <p className="font-medium">Design Homepage</p>
```
Replace with:
```tsx
              <p className="font-weight-medium">Design Homepage</p>
```

Find:
```tsx
              <span className="inline-flex items-center rounded-md border border-border-selected/20 bg-brand-bold/10 px-2 py-0.5 text-xs font-medium text-text-brand">
```
Replace with:
```tsx
              <span className="inline-flex items-center rounded-md border border-border-selected/20 bg-brand-bold/10 px-2 py-0.5 text-body-small font-weight-medium text-text-brand">
```

Find:
```tsx
            <p className="font-mono text-2xl font-bold tabular-nums text-text-brand">
```
Replace with:
```tsx
            <p className="font-mono text-heading-large font-weight-bold tabular-nums text-text-brand">
```

Find:
```tsx
          <div className="mb-1.5 flex items-center justify-between text-xs text-text-subtle">
```
Replace with:
```tsx
          <div className="mb-1.5 flex items-center justify-between text-body-small text-text-subtle">
```

Find:
```tsx
      <span className="text-lg font-bold tabular-nums text-text-brand">
```
Replace with:
```tsx
      <span className="text-body-xl font-weight-bold tabular-nums text-text-brand">
```

Find:
```tsx
      <span className="text-[10px] text-text-subtle">{label}</span>
```
Replace with:
```tsx
      <span className="text-body-small text-text-subtle">{label}</span>
```

- [ ] **Step 9: Verify no raw Tailwind text sizes remain in landing**

Run: `rg "text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)" src/components/landing/`
Expected: No output (zero matches). Also check: `rg "font-bold|font-semibold|font-medium" src/components/landing/`
Expected: No output (zero matches — all replaced with `font-weight-*`).

Also check: `rg "font-sans " src/components/landing/`
Expected: No output (all redundant `font-sans` removed).

- [ ] **Step 10: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/components/landing/
git commit -m "fix: unify landing page typography to use type scale"
```

---

### Task 6: Auth Typography Unification

**Files:**
- Modify: `src/components/auth/login.tsx`
- Modify: `src/components/auth/register.tsx`
- Modify: `src/components/auth/AuthShell.tsx`

- [ ] **Step 1: Update login.tsx**

In `src/components/auth/login.tsx`:

Find:
```tsx
        <h1 className="font-sans text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-text-subtle">Log in to your account</p>
```
Replace with:
```tsx
        <h1 className="text-heading-large font-weight-bold">Welcome back</h1>
        <p className="text-body text-text-subtle">Log in to your account</p>
```

Find all occurrences of `text-sm text-text-danger` and replace with `text-body text-text-danger` (3 occurrences: lines 49, 55, 62). Use `replaceAll: true`.

Find:
```tsx
      <p className="text-center text-sm text-text-subtle">
```
Replace with:
```tsx
      <p className="text-center text-body text-text-subtle">
```

Find:
```tsx
        <button onClick={onSwitchToRegister} className="font-medium text-text-brand underline-offset-4 hover:underline">
```
Replace with:
```tsx
        <button onClick={onSwitchToRegister} className="font-weight-medium text-text-brand underline-offset-4 hover:underline">
```

- [ ] **Step 2: Update register.tsx**

In `src/components/auth/register.tsx`:

Find:
```tsx
        <h1 className="font-sans text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-text-subtle">Start tracking your progress today</p>
```
Replace with:
```tsx
        <h1 className="text-heading-large font-weight-bold">Create your account</h1>
        <p className="text-body text-text-subtle">Start tracking your progress today</p>
```

Find all occurrences of `text-sm text-text-danger` and replace with `text-body text-text-danger` (5 occurrences: lines 49, 55, 62, 69, 76). Use `replaceAll: true`.

Find:
```tsx
      <p className="text-center text-sm text-text-subtle">
```
Replace with:
```tsx
      <p className="text-center text-body text-text-subtle">
```

Find:
```tsx
        <button onClick={onSwitchToLogin} className="font-medium text-text-brand underline-offset-4 hover:underline">
```
Replace with:
```tsx
        <button onClick={onSwitchToLogin} className="font-weight-medium text-text-brand underline-offset-4 hover:underline">
```

- [ ] **Step 3: Update AuthShell.tsx**

In `src/components/auth/AuthShell.tsx`:

Find:
```tsx
              <span className="text-sm text-text-inverse/90">{feature.text}</span>
```
Replace with:
```tsx
              <span className="text-body text-text-inverse/90">{feature.text}</span>
```

- [ ] **Step 4: Verify no raw Tailwind text sizes remain in auth**

Run: `rg "text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)" src/components/auth/`
Expected: No output. Also: `rg "font-bold|font-semibold|font-medium" src/components/auth/`
Expected: No output.

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/
git commit -m "fix: unify auth page typography to use type scale"
```

---

### Task 7: Align Skeletons to TaskCardRow

**Files:**
- Modify: `src/components/shared/skeletons/TaskCardSkeleton.tsx`
- Modify: `src/components/shared/skeletons/DashboardSkeleton.tsx`

- [ ] **Step 1: Rewrite TaskCardSkeleton to match TaskCardRow**

Replace the entire content of `src/components/shared/skeletons/TaskCardSkeleton.tsx` with:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export const TaskCardSkeleton = () => (
  <div className="relative flex items-center rounded-lg border bg-surface p-150 pl-200">
    {/* Status stripe */}
    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-surface-container" />

    <div className="flex flex-1 flex-col gap-050 min-w-0">
      {/* Top row: title + duration */}
      <div className="flex items-center justify-between gap-100">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Bottom row: badge + date */}
      <div className="flex items-center gap-075">
        <Skeleton className="h-5 w-20 rounded-xs" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Update DashboardSkeleton to remove sidebar**

Replace the entire content of `src/components/shared/skeletons/DashboardSkeleton.tsx` with:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

import { TaskCardSkeleton } from './TaskCardSkeleton';

export const DashboardSkeleton = () => (
  <div className="flex h-screen overflow-hidden w-full">
    {/* Main column */}
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-md" />
        <div className="ml-auto flex items-center gap-100">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Greeting */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Current task */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <TaskCardSkeleton />
        </div>

        {/* Task list */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-050">
            {[...Array(3)].map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);
```

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/skeletons/
git commit -m "fix: align skeletons to TaskCardRow layout, remove sidebar skeleton"
```

---

### Task 8: Create ProjectSwitcher Component

**Files:**
- Create: `src/components/dashboard/ProjectSwitcher.tsx`

This extracts the ProjectSwitcher from DashboardSidebar.tsx (lines 42-119) with a compact horizontal trigger suitable for the top bar.

- [ ] **Step 1: Create ProjectSwitcher.tsx**

Create `src/components/dashboard/ProjectSwitcher.tsx` with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, FolderOpen, Settings as SettingsIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { getProjects, switchProject, type ProjectListItem } from '@/actions/project';
import { useUserContext } from '@/contexts/user.context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ProjectSwitcher({ onManageProjects }: { onManageProjects: () => void }) {
  const { user, refetchUser } = useUserContext();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  const { execute: loadProjects } = useAction(getProjects, {
    onSuccess: ({ data }) => {
      if (data) setProjects(data);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to load projects'),
  });

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { execute: executeSwitch } = useAction(switchProject, {
    onSuccess: () => {
      refetchUser();
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to switch project'),
  });

  const activeId = user?.currentProjectId;
  const activeName = user?.currentProject?.name;
  const activeProjects = projects.filter((p) => !p.archived);

  const triggerLabel = activeName ?? (activeProjects.length === 0 ? 'Create a project' : 'Select project');

  const handleTriggerClick = () => {
    if (activeProjects.length === 0) {
      onManageProjects();
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) loadProjects(); }}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex cursor-pointer items-center gap-075 rounded-md px-075 py-050 text-left hover:bg-neutral-subtle-hovered transition-colors"
          onClick={handleTriggerClick}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-container">
            <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
          </div>
          <span className={`truncate text-body font-weight-medium ${activeName ? 'text-text' : 'text-text-subtle'}`}>
            {triggerLabel}
          </span>
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

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ProjectSwitcher.tsx
git commit -m "feat: extract ProjectSwitcher component for top bar use"
```

---

### Task 9: Rewrite DashboardTopBar

**Files:**
- Modify: `src/components/dashboard/DashboardTopBar.tsx`

Absorb logo, project switcher, and settings trigger. Remove mobile menu button and "Tasks" title.

- [ ] **Step 1: Rewrite DashboardTopBar.tsx**

Replace the entire content of `src/components/dashboard/DashboardTopBar.tsx` with:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Laptop, LogOut, Moon, Plus, Settings as SettingsIcon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useUserContext } from '@/contexts/user.context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings } from '@/components/shared/Settings';

import ProjectSwitcher from './ProjectSwitcher';

export default function DashboardTopBar() {
  const { setTheme } = useTheme();
  const { user, logout, refetchUser } = useUserContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }, [user]);

  const handleCreateTask = () => {
    window.dispatchEvent(new CustomEvent('create-task'));
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-surface/80 px-4 backdrop-blur">
      {/* Logo */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-bold text-sm font-weight-bold text-text-inverse">
        M
      </div>

      {/* Project switcher */}
      <ProjectSwitcher onManageProjects={() => setSettingsOpen(true)} />

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-100">
        {user?.currentProjectId && (
          <Button variant="primary" size="sm" className="cursor-pointer" onClick={handleCreateTask}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create task</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="subtle" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Laptop className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focused">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-brand-subtlest text-xs font-weight-medium text-text-brand">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="font-weight-normal">
              <p className="text-body font-weight-medium text-text">{user?.name}</p>
              <p className="text-body-small text-text-subtle truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer">
              <SettingsIcon className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-text-danger">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Settings Dialog */}
      {settingsOpen && (
        <Settings
          weekStartDay={user?.weekStartDay ?? 'MONDAY'}
          refetch={refetchUser}
          open={settingsOpen}
          setOpen={setSettingsOpen}
        />
      )}
    </header>
  );
}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardTopBar.tsx
git commit -m "feat: rewrite DashboardTopBar with logo, project switcher, and settings"
```

---

### Task 10: Simplify DashboardShell (Remove Sidebar)

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx`

- [ ] **Step 1: Simplify DashboardShell.tsx**

Replace the entire content of `src/components/dashboard/DashboardShell.tsx` with:

```tsx
'use client';

import { type ReactNode } from 'react';

import DashboardTopBar from './DashboardTopBar';

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden w-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx
git commit -m "feat: remove sidebar from DashboardShell"
```

---

### Task 11: Delete DashboardSidebar + Final Verification

**Files:**
- Delete: `src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1: Delete DashboardSidebar.tsx**

Run: `rm src/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 2: Verify no imports of DashboardSidebar remain**

Run: `rg "DashboardSidebar" src/`
Expected: No output (zero matches)

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors)

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: PASS (no errors)

- [ ] **Step 5: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: delete DashboardSidebar, complete top bar consolidation"
```

- [ ] **Step 7: Visual verification checklist**

Start dev server (`pnpm dev`) and verify:
1. **Top bar**: "M" logo visible on left, project switcher dropdown works (switch projects, manage projects opens settings), settings opens from avatar menu, create task button works
2. **No sidebar**: No sidebar visible on any screen size. No mobile menu button.
3. **Dark mode primary button**: "Create task" button is vivid blue (#357DE8) with white text. Hover darkens, press darkens further.
4. **Light mode primary button**: Button is #1868DB with white text (unchanged).
5. **Status badges**: All five statuses display with slightly more saturated backgrounds and bolder text. Success badge no longer looks muddy.
6. **CTA section**: Blue gradient background (not broken), white button with blue text.
7. **Landing typography**: All headings use the type scale. No raw text-4xl/5xl/6xl.
8. **Auth forms**: Headings use text-heading-large. No raw text-2xl.
9. **Skeletons**: Loading state matches compact TaskCardRow layout. No sidebar in skeleton.
10. **Editor**: Code blocks and syntax highlighting render correctly in both light and dark mode.
