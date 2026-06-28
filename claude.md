# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My Progress is a personal productivity and task tracking application with time logging, built for freelancers and professionals. It's a Next.js 16 application using App Router, PostgreSQL, Prisma, and shadcn/ui.

- shadcn/ui is PRIMARY - always check https://ui.shadcn.com before creating components
- Server Components by default; `'use client'` only when necessary
- All mutations use Server Actions with next-safe-action
- Skeleton loaders, not spinners; empty states with helpful messages
- ARIA labels, keyboard navigation, reduced motion support

## Development Commands

```bash
# Development
pnpm dev              # Start dev server (http://localhost:3000)

# Database
docker-compose up -d  # Start PostgreSQL
pnpm prisma studio    # Database GUI
pnpm prisma migrate dev --name <name>  # Create migration
pnpm prisma generate   # Regenerate Prisma Client (after schema changes)

# Code Quality
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format:write     # Prettier format
pnpm format:check     # Check formatting

# Build
pnpm build            # Production build (runs prisma generate + next build)
pnpm start            # Start production server
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 with App Router (React Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma 7 ORM
- **Styling**: Tailwind CSS 4
- **UI**: shadcn/ui (Radix UI primitives) - check first before creating components
- **Forms**: React Hook Form + Zod validation
- **Mutations**: next-safe-action (Server Actions, NOT API routes)
- **Auth**: JWT with HTTP-only cookies

### Key Architecture Patterns

**Server Actions Pattern**: All data mutations use Server Actions, not API routes

```typescript
'use server';

import { z } from 'zod';

import { actionClient } from '@/lib/action-client';

export const createTask = actionClient.inputSchema(z.object({ title: z.string() })).action(async ({ parsedInput }) => {
  const user = await validateUserToken(); // Auth first
  // ... logic
  revalidatePath(paths.home); // Invalidate cache
});
```

**Authentication Flow**: JWT tokens stored in HTTP-only cookies

- Server-side: `validateUserToken()` helper in `src/helpers/validate-user.tsx`
- Client-side: `useUserContext()` hook provides user data
- Token generation: `src/lib/generate-token.ts`

**Type System**: Derive types from Prisma models

```typescript
import type { Task as ITask } from '../../generated/prisma/client';

export type Task = ITask;
```

**Important**: Prisma Client is generated to `generated/prisma/client` (not `node_modules/.prisma`).

### Directory Structure

```
src/
├── actions/         # Server Actions (mutations) - 'use server' directive
├── app/             # Next.js App Router pages
│   ├── layout.tsx   # Root layout with providers (UserProvider, ThemeProvider)
│   └── page.tsx     # Home page (tasks dashboard)
├── components/
│   ├── ui/          # shadcn/ui components (install via npx shadcn add)
│   ├── shared/      # Reusable components (animations, skeletons, empty states)
│   ├── auth/        # Login/register forms
│   ├── task/        # Task-related components
│   └── editor/      # Lexical rich text editor
├── contexts/        # React Context providers
│   ├── user.context.tsx    # User state (fetches via `me` action)
│   └── task.context.tsx    # Task state & CRUD operations
├── helpers/         # Server-side helpers
│   └── validate-user.tsx   # Auth middleware for Server Actions
├── lib/             # Core utilities
│   ├── db.ts              # Prisma client singleton
│   ├── action-client.ts   # next-safe-action config
│   ├── hash.ts            # Password hashing (node:crypto)
│   └── generate-token.ts  # JWT generation/verification
├── schema/          # Zod validation schemas
├── types/           # TypeScript types (derived from Prisma)
├── utils/           # Utility functions
└── constants/       # App constants (status colors, design tokens)
```

### Database Schema

**User**: id, email, password (hashed), name, currentProject, currentCompany
**Task**: id, title, status (enum: IN_PROGRESS/PAUSED/RESUMED/COMPLETED/CANCELLED), progress (rich text JSON), todo (rich text JSON), currentProject, currentCompany, userId → User
**TaskTime**: id, from (start), to (end), taskId → Task

Time tracking: Each task has multiple TaskTime records for tracking work sessions. When a task is resumed, a new TaskTime record is created.

### Adding New Features

1. **Database changes**: Update `prisma/schema.prisma` → `pnpm prisma migrate dev`
2. **Server Action**: Create in `src/actions/` with `'use server'`, use `actionClient`, Zod validation
3. **Component**: Check shadcn/ui first. If not available, create using shadcn components as building blocks
4. **Types**: Import from `generated/prisma/client`, use type aliases
5. **Routes**: Add path to `src/paths.ts`

### Component Development Workflow

1. Check https://ui.shadcn.com - if component exists, `npx shadcn@latest add <component>`
2. Create in appropriate folder (shared/, task/, etc.)
3. Add `'use client'` only if using hooks/events
4. Use Server Actions via `useAction` hook from next-safe-action
5. Add skeleton loaders for loading states
6. Ensure ARIA labels and keyboard navigation

## Common Patterns

**Client Component with Server Action**:

```typescript
'use client';
import { useAction } from 'next-safe-action/hooks';
import { createTask } from '@/actions/task';

export default function TaskForm() {
  const { execute, isPending } = useAction(createTask, {
    onSuccess: ({ data }) => console.log('Created!'),
    onError: ({ error }) => console.error(error.serverError),
  });
  return <form action={execute}>...</form>;
}
```

**Toast Notifications**: Use `sonner` (already in layout)

```typescript
import { toast } from 'sonner';

toast.success('Task completed! 🎉');
toast.error('Failed to save');
```

**Empty States**: Use `EmptyState` component from `components/shared/`

```typescript
<EmptyState
  icon={<ClipboardList />}
  title="No tasks yet"
  description="Create your first task to start tracking."
  action={{ label: 'Create Task', onClick: handleCreate }}
/>
```

## Environment Variables

Required in `.env`:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Minimum 32 characters for token signing
- `NEXT_PUBLIC_SITE_URL` - Application URL

## Active Technologies

- TypeScript 5.9+ (strict mode) + Next.js 16, React 19, Tailwind CSS 4, Framer Motion (animations), Sonner (toasts), Radix UI primitives (001-mobile-responsive-design)
- N/A (UI enhancement, no database changes) (001-mobile-responsive-design)

