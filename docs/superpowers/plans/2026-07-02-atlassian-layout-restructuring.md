# Atlassian Layout Restructuring (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the dashboard layout to Atlassian product conventions — enrich topbar with create button and user avatar, add project switcher to sidebar, replace task table with Jira-style card rows, update empty states and motion tokens.

**Architecture:** Modify the existing `DashboardShell` (sidebar + topbar + main). Move user context from sidebar to topbar. Create a new `TaskCardRow` component to replace the table. Update animation components with Atlassian motion values. All changes are CSS/component-level — no database, server action, or routing changes.

**Tech Stack:** Next.js 16 (App Router), React 19, Framer Motion, shadcn/ui (new-york), Tailwind CSS v4, Atlassian Design System tokens (Phase 1 complete)

---

## File Structure

### Modified
- `src/components/dashboard/DashboardTopBar.tsx` — add page title, create button, user avatar dropdown
- `src/components/dashboard/DashboardSidebar.tsx` — add project switcher, section label, remove user section, restyle nav
- `src/components/task/List.tsx` — replace table with card row list + pagination
- `src/components/task/index.tsx` — update section headers, pass create handler to topbar
- `src/components/task/EnhancedCard.tsx` — update current task card styling
- `src/components/shared/EmptyState.tsx` — Atlassian empty state pattern
- `src/components/shared/Status.tsx` — use STATUS_TOKENS labels
- `src/components/shared/PageTransition.tsx` — Atlassian motion tokens
- `src/components/shared/animations/FadeIn.tsx` — Atlassian motion
- `src/components/shared/animations/SlideIn.tsx` — Atlassian motion
- `src/components/shared/animations/StaggerList.tsx` — Atlassian motion
- `src/components/dashboard/DashboardShell.tsx` — wire create button callback

### Created
- `src/components/task/TaskCardRow.tsx` — individual Jira-style task card row

---

## Task 1: Enrich DashboardTopBar

**Files:**
- Modify: `src/components/dashboard/DashboardTopBar.tsx`
- Modify: `src/components/dashboard/DashboardShell.tsx`

The topbar currently has only a mobile menu button and theme toggle. Add page title, create button, and user avatar dropdown.

- [ ] **Step 1: Rewrite DashboardTopBar.tsx**

Replace the entire file with:

```tsx
'use client';

import { useMemo } from 'react';
import { Laptop, LogOut, Menu, Moon, Plus, Sun } from 'lucide-react';
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

type Props = {
  onMenuClick: () => void;
  onCreateTask?: () => void;
};

export default function DashboardTopBar({ onMenuClick, onCreateTask }: Props) {
  const { setTheme } = useTheme();
  const { user, logout } = useUserContext();

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [user]);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-surface/80 px-4 backdrop-blur">
      {/* Mobile menu */}
      <Button variant="subtle" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      <h1 className="text-heading-xsmall font-weight-bold text-text">Tasks</h1>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-100">
        {/* Create button */}
        {onCreateTask && (
          <Button variant="primary" size="sm" className="cursor-pointer" onClick={onCreateTask}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create task</span>
          </Button>
        )}

        {/* Theme toggle */}
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
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Laptop className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar */}
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
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-text-danger">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update DashboardShell.tsx to pass onCreateTask**

Replace the DashboardShell with:

```tsx
'use client';

import { useState, type ReactNode } from 'react';

import DashboardSidebar from './DashboardSidebar';
import DashboardTopBar from './DashboardTopBar';

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  return (
    <CreateTaskContext.Provider value={{ open: createTaskOpen, setOpen: setCreateTaskOpen }}>
      <div className="flex h-screen overflow-hidden w-full">
        <DashboardSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardTopBar
            onMenuClick={() => setMobileOpen(true)}
            onCreateTask={() => setCreateTaskOpen(true)}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </CreateTaskContext.Provider>
  );
}
```

Wait — we don't want to create a new context for this. The create task drawer is already managed in `TaskPage` (`src/components/task/index.tsx`). The topbar's create button needs to trigger the same drawer. 

Better approach: **Don't wire the create button through DashboardShell**. Instead, the topbar create button can dispatch a custom event that TaskPage listens for, OR we can keep the create button in the task list section header (as it is now) and have the topbar button also be there.

Simplest approach: **The topbar create button uses a global custom event** that TaskPage listens to. This avoids context plumbing through the component tree.

Actually, even simpler: since there's only one page (`/dashboard`), the TaskPage IS the main content. Let me use a simple approach — the topbar button renders nothing if `onCreateTask` is not provided, and DashboardShell doesn't need to know about it. The TaskPage can't easily pass a callback to the topbar since they're siblings.

**Revised approach:** Use a window CustomEvent.

Update DashboardTopBar's create button to dispatch a custom event:

```tsx
{onCreateTask && (
  <Button variant="primary" size="sm" className="cursor-pointer" onClick={onCreateTask}>
```

becomes (always render, use custom event):

Actually, let me keep it simpler. The create button in the topbar just dispatches `window.dispatchEvent(new CustomEvent('create-task'))` and TaskPage listens for it.

Replace DashboardTopBar.tsx entirely (revised — no `onCreateTask` prop, uses CustomEvent):

```tsx
'use client';

import { useMemo } from 'react';
import { Laptop, LogOut, Menu, Moon, Plus, Sun } from 'lucide-react';
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

export default function DashboardTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { setTheme } = useTheme();
  const { user, logout } = useUserContext();

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }, [user]);

  const handleCreateTask = () => {
    window.dispatchEvent(new CustomEvent('create-task'));
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-surface/80 px-4 backdrop-blur">
      <Button variant="subtle" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="text-heading-xsmall font-weight-bold text-text">Tasks</h1>

      <div className="ml-auto flex items-center gap-100">
        <Button variant="primary" size="sm" className="cursor-pointer" onClick={handleCreateTask}>
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create task</span>
        </Button>

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
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-text-danger">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

DashboardShell.tsx stays unchanged (the `onMenuClick` prop is the only one).

- [ ] **Step 3: Update TaskPage to listen for the create-task event**

In `src/components/task/index.tsx`, add a useEffect to listen for the custom event. Add this after the existing state declarations (after line 31):

```tsx
useEffect(() => {
  const handler = () => setOpenCreateTaskDrawer(true);
  window.addEventListener('create-task', handler);
  return () => window.removeEventListener('create-task', handler);
}, []);
```

Add `useEffect` to the import from react on line 3:
```tsx
import { MouseEvent, useEffect, useState, type FC } from 'react';
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardTopBar.tsx src/components/task/index.tsx
git commit -m "feat: enrich topbar with page title, create button, and user avatar"
```

---

## Task 2: Enrich DashboardSidebar

**Files:**
- Modify: `src/components/dashboard/DashboardSidebar.tsx`

Remove user section, add project/company switcher, add section label, restyle nav items.

- [ ] **Step 1: Rewrite DashboardSidebar.tsx**

Replace the entire file with:

```tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Settings as SettingsIcon,
  PanelLeftClose,
} from 'lucide-react';

import { useUserContext } from '@/contexts/user.context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import { Settings } from '@/components/shared/Settings';

type NavItem = {
  icon: typeof ClipboardList;
  label: string;
  href?: string;
  action?: string;
};

const navItems: NavItem[] = [
  { icon: ClipboardList, label: 'Tasks', href: '/dashboard' },
  { icon: SettingsIcon, label: 'Settings', action: 'settings' },
];

export default function DashboardSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const { user, refetchUser } = useUserContext();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const handleNavClick = (item: NavItem) => {
    if (item.action === 'settings') {
      setSettingsOpen(true);
      onMobileClose();
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex h-16 items-center border-b ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-bold text-sm font-weight-bold text-text-inverse">
            M
          </div>
          {!collapsed && <span className="text-base font-weight-semibold">My Progress</span>}
        </div>
      </div>

      {/* Project/Company switcher (hidden when collapsed) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full cursor-pointer items-center gap-075 rounded-md px-075 py-050 text-left hover:bg-neutral-subtle-hovered transition-colors">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-container">
                  <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-body font-weight-medium text-text">
                    {user?.currentProject || 'No project'}
                  </p>
                  {(user?.currentCompany || user?.currentProject) && (
                    <p className="truncate text-body-small text-text-subtlest">
                      {user?.currentCompany || 'No company'}
                    </p>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-icon-subtle" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="w-56">
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-075">
                  <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
                  <span className="text-body-small text-text-subtlest">Project</span>
                </div>
                <p className="truncate text-body font-weight-medium text-text pl-6">
                  {user?.currentProject || 'Not set'}
                </p>
              </div>
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-075">
                  <Building2 className="h-3.5 w-3.5 text-icon-subtle" />
                  <span className="text-body-small text-text-subtlest">Company</span>
                </div>
                <p className="truncate text-body font-weight-medium text-text pl-6">
                  {user?.currentCompany || 'Not set'}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setSettingsOpen(true); onMobileClose(); }}
                className="cursor-pointer"
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Edit project settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-200 pb-050">
          <span className="text-body-small text-text-subtlest">Navigation</span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 space-y-050 p-3">
        {navItems.map((item) => {
          const isActive = item.href === pathname;
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={`flex w-full cursor-pointer items-center gap-075 rounded-md px-075 py-075 text-body font-weight-medium transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-selected text-text-selected'
                  : 'text-text-subtle hover:bg-neutral-subtle-hovered hover:text-text'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden border-t p-3 md:block">
        <button
          onClick={toggleCollapsed}
          className="flex w-full cursor-pointer items-center gap-075 rounded-md px-075 py-075 text-body text-text-subtle hover:bg-neutral-subtle-hovered hover:text-text"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Settings Dialog */}
      {settingsOpen && (
        <Settings
          currentCompany={user?.currentCompany ?? ''}
          currentProject={user?.currentProject ?? ''}
          weekStartDay={user?.weekStartDay ?? 'MONDAY'}
          refetch={refetchUser}
          open={settingsOpen}
          setOpen={setSettingsOpen}
        />
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden shrink-0 border-r bg-surface transition-all duration-300 md:block ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
```

Key changes:
- Removed user section (avatar, name, email, logout) — moved to topbar
- Removed `useMemo`, `Avatar`, `AvatarFallback`, `LogOut`, `Button` imports that are no longer needed
- Added project/company switcher dropdown below logo
- Added "Navigation" section label
- Nav items use `bg-selected text-text-selected` for active (instead of border-l + bg-brand-bold/10)
- Nav items use `rounded-md` and Atlassian spacing (`gap-075`, `px-075`, `py-075`)
- Icons use `h-4 w-4` (16px, Atlassian standard) instead of `h-5 w-5`

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardSidebar.tsx
git commit -m "feat: add project switcher and section label to sidebar, move user to topbar"
```

---

## Task 3: Create TaskCardRow component

**Files:**
- Create: `src/components/task/TaskCardRow.tsx`

Create a new Jira-style card row component for individual tasks.

- [ ] **Step 1: Create TaskCardRow.tsx**

```tsx
'use client';

import type { FC, MouseEvent } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, Check, Clock, MoreHorizontal, Pause, Play } from 'lucide-react';

import type { TaskWithLoggedTime } from '@/types/task';
import { STATUS_TOKENS } from '@/constants/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
  task: NonNullable<TaskWithLoggedTime>;
  onPlay?: (e: MouseEvent<HTMLButtonElement>) => void;
  onPause?: (e: MouseEvent<HTMLButtonElement>) => void;
  onComplete?: (e: MouseEvent<HTMLButtonElement>) => void;
  onEdit?: () => void;
  onClick?: () => void;
  isLoading?: boolean;
  index?: number;
};

const TaskCardRow: FC<Props> = ({
  task,
  onPlay,
  onPause,
  onComplete,
  onEdit,
  onClick,
  isLoading,
  index = 0,
}) => {
  const displayStatus = task.status === 'RESUMED' ? 'IN_PROGRESS' : task.status;
  const tokens = STATUS_TOKENS[displayStatus as keyof typeof STATUS_TOKENS];
  const isActive = ['IN_PROGRESS', 'RESUMED'].includes(task.status);
  const isCompleted = task.status === 'COMPLETED';
  const isCancelled = task.status === 'CANCELLED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.15, ease: [0.4, 1, 0.6, 1] }}
    >
      <div
        className={`group relative flex cursor-pointer items-center gap-150 rounded-lg border bg-surface p-150 pl-200 transition-colors hover:bg-surface-container ${
          isActive ? 'shadow-raised' : ''
        }`}
        onClick={onClick}
      >
        {/* Status stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${tokens.stripe}`} />

        {/* Content */}
        <div className="flex flex-1 flex-col gap-050 min-w-0">
          {/* Row 1: title + meta */}
          <div className="flex items-center justify-between gap-100">
            <h3 className="truncate text-body font-weight-medium text-text">
              {task.title}
            </h3>
            <div className="flex shrink-0 items-center gap-075 text-body-small text-text-subtle">
              {task.duration && (
                <span className="flex items-center gap-025">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{task.duration}</span>
                </span>
              )}
              {task.currentProject && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-32">{task.currentProject}</span>
                </>
              )}
            </div>
          </div>

          {/* Row 2: status + date + actions */}
          <div className="flex items-center justify-between gap-100">
            <div className="flex items-center gap-075">
              <Badge variant="outline" className={tokens.badge}>
                {tokens.label}
              </Badge>
              <span className="flex items-center gap-025 text-body-small text-text-subtlest">
                <Calendar className="h-3 w-3" />
                {format(task.createdAt, 'MMM dd')}
              </span>
            </div>

            {/* Inline actions */}
            {!isCompleted && !isCancelled && (
              <div className="flex items-center gap-025 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                {isActive && onPause && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => { e.stopPropagation(); onPause(e); }}
                    className="cursor-pointer"
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!isActive && onPlay && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => { e.stopPropagation(); onPlay(e); }}
                    className="cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onComplete && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => { e.stopPropagation(); onComplete(e); }}
                    className="cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="subtle"
                        size="icon-sm"
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TaskCardRow;
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/task/TaskCardRow.tsx
git commit -m "feat: add Jira-style TaskCardRow component"
```

---

## Task 4: Replace task table with card row list

**Files:**
- Modify: `src/components/task/List.tsx`
- Modify: `src/components/task/index.tsx`

Replace the `TableData` component with a list of `TaskCardRow` components and simple pagination.

- [ ] **Step 1: Rewrite List.tsx**

Replace the entire file with:

```tsx
import { useEffect, useRef, type FC, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

import { useTaskContext } from '@/contexts/task.context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';

import TaskCardRow from './TaskCardRow';

const List: FC = () => {
  const {
    executeGetTaskById,
    updateTask,
    setPage,
    tasks,
    totalTasks,
    limit,
    page,
    fetchTasks,
    isExecutingUpdateTask,
  } = useTaskContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, page]);

  if (!tasks) return null;

  if (!tasks?.length) {
    return (
      <EmptyState
        icon={<ClipboardList className="w-10 h-10" />}
        title="No tasks found"
        description="You don't have any tasks yet. Create your first task to get started."
      />
    );
  }

  const totalPages = Math.ceil(totalTasks / limit);

  const handlePlay = (taskId: string) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isExecutingUpdateTask) return;
    updateTask({ status: 'RESUMED', id: taskId });
  };

  const handlePause = (taskId: string) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isExecutingUpdateTask) return;
    updateTask({ status: 'PAUSED', id: taskId });
  };

  const handleComplete = (taskId: string) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isExecutingUpdateTask) return;
    updateTask({ status: 'COMPLETED', id: taskId });
  };

  return (
    <div className="space-y-050">
      {/* Task card rows */}
      {tasks.map((task, idx) => (
        <TaskCardRow
          key={task.id}
          task={task}
          index={idx}
          isLoading={isExecutingUpdateTask}
          onPlay={handlePlay(task.id)}
          onPause={handlePause(task.id)}
          onComplete={handleComplete(task.id)}
          onClick={() => executeGetTaskById({ taskId: task.id })}
        />
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-200">
          <span className="text-body-small text-text-subtle">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-050">
            <Button
              variant="default"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default List;
```

- [ ] **Step 2: Update TaskPage section headers**

In `src/components/task/index.tsx`, update the "Tasks" section to use a sticky header and sentence case:

Replace the "Current Task" header (line 100):
```tsx
<h2 className="text-xl font-bold">Current Task</h2>
```
with:
```tsx
<h2 className="text-heading-small font-weight-bold text-text">Current task</h2>
```

Replace the "Tasks" section header (lines 125-131):
```tsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-bold">Tasks</h2>
  <Plus
    className="w-5 h-5 cursor-pointer text-text-subtle hover:text-text-brand transition-colors"
    onClick={() => setOpenCreateTaskDrawer(true)}
  />
</div>
```
with:
```tsx
<div className="sticky top-0 z-10 flex items-center justify-between bg-surface/80 backdrop-blur py-200 -mx-2 px-2 mb-200">
  <div className="flex items-center gap-075">
    <h2 className="text-heading-small font-weight-bold text-text">Tasks</h2>
  </div>
  <Button variant="subtle" size="sm" className="cursor-pointer" onClick={() => setOpenCreateTaskDrawer(true)}>
    <Plus className="w-3.5 h-3.5" />
    Add
  </Button>
</div>
```

Add `Button` to the imports if not already there. It should already be imported via `EnhancedTaskCard` usage.

Also update the empty state "Create Task" label to sentence case:
```tsx
action={{
  label: 'Create task',
  onClick: () => setOpenCreateTaskDrawer(true),
}}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/task/List.tsx src/components/task/index.tsx
git commit -m "feat: replace task table with Jira-style card rows and pagination"
```

---

## Task 5: Update EmptyState component

**Files:**
- Modify: `src/components/shared/EmptyState.tsx`

- [ ] **Step 1: Update EmptyState styling**

Replace the entire file with:

```tsx
import type { FC, ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Props = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export const EmptyState: FC<Props> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-400 px-4 text-center">
    {icon && (
      <div className="mb-150 text-icon-subtle" aria-hidden>
        {icon}
      </div>
    )}
    <h3 className="text-heading-medium font-weight-bold text-text mb-050">{title}</h3>
    <p className="text-body text-text-subtle mb-200 max-w-sm">{description}</p>
    {action && (
      <Button variant="primary" size="sm" className="cursor-pointer" onClick={action.onClick}>
        <Plus className="w-3.5 h-3.5" />
        {action.label}
      </Button>
    )}
  </div>
);
```

Key changes:
- Removed `rounded-xl bg-brand-bold/5 p-4 text-text-brand/60` icon wrapper — just `text-icon-subtle`
- Title: `text-heading-medium font-weight-bold` (Atlassian type scale)
- Description: `text-body text-text-subtle` (Atlassian type scale)
- Padding: `py-400` (32px, generous)
- Button: `variant="primary"` (brand-bold)
- Action label uses sentence case via callers

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/EmptyState.tsx
git commit -m "feat: update empty states to Atlassian pattern"
```

---

## Task 6: Update Status component

**Files:**
- Modify: `src/components/shared/Status.tsx`

- [ ] **Step 1: Update Status to use STATUS_TOKENS labels**

Replace the entire file with:

```tsx
import type { FC } from 'react';

import { STATUS_TOKENS } from '@/constants/status';

import { TaskStatus } from '../../../generated/prisma/enums';

type Props = {
  status: TaskStatus;
};

const Status: FC<Props> = ({ status }) => {
  const displayStatus = status === 'RESUMED' ? 'IN_PROGRESS' : status;
  const tokens = STATUS_TOKENS[displayStatus as keyof typeof STATUS_TOKENS];

  if (!tokens) return null;

  return (
    <span
      className={`inline-flex items-center rounded-xs border px-050 text-body-small font-weight-medium ${tokens.badge}`}
    >
      {tokens.label}
    </span>
  );
};

export default Status;
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Status.tsx
git commit -m "feat: update Status component to use STATUS_TOKENS labels"
```

---

## Task 7: Update EnhancedTaskCard styling

**Files:**
- Modify: `src/components/task/EnhancedCard.tsx`

Apply Atlassian type scale and motion tokens to the current task card.

- [ ] **Step 1: Update EnhancedCard styling**

Make these changes in `src/components/task/EnhancedCard.tsx`:

1. Replace `font-display` references with Atlassian classes:
   - Line 79: `className="text-lg font-semibold truncate group-hover:text-text-brand transition-colors"` → `className="text-heading-small font-weight-bold truncate group-hover:text-text-brand transition-colors"`

2. Update motion transition (line 65):
   - `transition={{ type: 'spring', stiffness: 300, damping: 24 }}` → `transition={{ duration: 0.15, ease: [0.4, 1, 0.6, 1] }}`

3. Update whileHover (line 64):
   - `whileHover={{ scale: 1.01, y: -2 }}` → `whileHover={{ y: -2 }}` (remove scale for subtler effect)

4. Update Card className (line 68):
   - `className="group relative overflow-hidden rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-250 cursor-pointer"` → `className="group relative overflow-hidden rounded-lg hover:shadow-raised transition-all duration-150 cursor-pointer"`

5. Update status badge to use STATUS_TOKENS:
   - Line 4: Change `STATUS_STYLES` to `STATUS_TOKENS`
   - Line 54: Change `STATUS_STYLES` to `STATUS_TOKENS`
   - Line 109-110: Change badge content to use `statusColor.label` (lowercase): `{statusColor.label}`

6. Update status badge display (line 109):
   - `<Badge className={`${statusColor.badge} p-2`}>` → `<Badge variant="outline" className={`${statusColor.badge}`}>`

7. Update header labels to sentence case (line 100):
   - `<h2 className="text-xl font-bold">Current Task</h2>` is in index.tsx (already handled in Task 4)

8. Update quick action button text to sentence case:
   - "Resume" stays "Resume"
   - "Pause" stays "Pause"  
   - "Complete" stays "Complete"
   - These are already sentence case.

9. Remove commented-out code (lines 85-103, 128-143) — clean up dead code we're touching.

10. Update `ProgressAndTodo` title styling (line 24):
    - `<h6 className="font-medium">` → `<h6 className="text-body-small font-weight-bold text-text-subtlest">`

11. Update "No Data" text (line 28):
    - `<div className="border rounded-sm p-1 text-sm text-center">No Data</div>` → `<div className="border rounded-sm p-1 text-body-small text-text-subtle text-center">No data</div>`

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/task/EnhancedCard.tsx
git commit -m "feat: update EnhancedTaskCard with Atlassian type scale and motion tokens"
```

---

## Task 8: Update motion components

**Files:**
- Modify: `src/components/shared/animations/FadeIn.tsx`
- Modify: `src/components/shared/animations/SlideIn.tsx`
- Modify: `src/components/shared/animations/StaggerList.tsx`
- Modify: `src/components/shared/PageTransition.tsx`

- [ ] **Step 1: Update FadeIn.tsx**

Replace transition config:
```tsx
export const FadeIn = ({ children, delay = 0, duration = 0.15, ...props }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration, ease: [0.4, 1, 0.6, 1] }}
    {...props}
  >
    {children}
  </motion.div>
);
```

Changes: default duration `0.15` (150ms = short), y offset `12` (smaller), ease `outPractical`.

- [ ] **Step 2: Update SlideIn.tsx**

Replace transition config:
```tsx
const directionVariants = {
  left: { x: -40 },
  right: { x: 40 },
  up: { y: -40 },
  down: { y: 40 },
};

export const SlideIn = ({ children, direction = 'up', delay = 0, ...props }: Props) => (
  <motion.div
    initial={{ opacity: 0, ...directionVariants[direction] }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    transition={{ delay, duration: 0.2, ease: [0.4, 1, 0.6, 1] }}
    {...props}
  >
    {children}
  </motion.div>
);
```

Changes: smaller offsets (40px vs 100px), spring → tween with `duration: 0.2` (200ms = medium) + outPractical easing.

- [ ] **Step 3: Update StaggerList.tsx**

```tsx
export const StaggerList = ({ children, staggerDelay = 0.05, className }: Props) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      visible: {
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0 },
    }}
    transition={{ duration: 0.15, ease: [0.4, 1, 0.6, 1] }}
  >
    {children}
  </motion.div>
);
```

Changes: stagger delay stays 0.05 (50ms = xxshort). StaggerItem: y offset 8, spring → tween with short duration + outPractical.

- [ ] **Step 4: Update PageTransition.tsx**

```tsx
export const PageTransition = ({ children }: Props) => {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2, ease: [0.4, 1, 0.6, 1] }}
        className="flex-1 flex"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
```

Changes: duration `0.2` (medium), ease outPractical, y offset 12.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/animations/ src/components/shared/PageTransition.tsx
git commit -m "feat: apply Atlassian motion tokens to all animation components"
```

---

## Task 9: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Visual verification**

Run: `pnpm dev`
Open: `http://localhost:3000/dashboard`

Verify:
- Topbar: "Tasks" title left, "Create task" button + theme toggle + user avatar right
- Sidebar: logo → project switcher → "Navigation" label → Tasks + Settings nav → collapse toggle (no user section)
- Task list: card rows with left status stripe, hover actions (play/pause, complete, more)
- Active task card has raised shadow
- Sticky "Tasks" header above the list
- Empty state shows proper Atlassian styling
- Motion is subtle and smooth (short durations, outPractical easing)
- Pagination at bottom if >1 page
- User avatar dropdown shows name, email, and logout

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: layout restructuring cleanup"
```

---

## Post-Implementation Notes

- The `create-task` CustomEvent approach is a pragmatic bridge between the topbar and TaskPage. If the app grows more pages, this should be replaced with a proper context or zustand store.
- The `TableData` shared component is no longer used by the task list. It can be kept for future use or removed.
- The `Status.tsx` component now uses `STATUS_TOKENS` labels directly — the `Statuses` map in `status.ts` is no longer needed by this component (but kept for backward compatibility).
- Phase 2 does NOT change: database schema, server actions, routing, authentication, or the landing page.
