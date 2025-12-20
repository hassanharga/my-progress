# Development Documentation

**For AI Assistants & Developers** - This document provides architectural and technical details for understanding, maintaining, and extending the My Progress application.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Patterns & Conventions](#core-patterns--conventions)
4. [Key Components](#key-components)
5. [Data Flow](#data-flow)
6. [Authentication System](#authentication-system)
7. [Database Layer](#database-layer)
8. [Server Actions](#server-actions)
9. [Adding New Features](#adding-new-features)
10. [Common Tasks](#common-tasks)
11. [Type System](#type-system)
12. [Best Practices](#best-practices)

---

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16 with App Router (React Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Radix UI + Tailwind CSS 4
- **Forms**: React Hook Form + Zod validation
- **Server Actions**: next-safe-action for type-safe mutations
- **Authentication**: JWT tokens stored in HTTP-only cookies

### Architectural Principles
1. **Server-First**: Maximize Server Components, minimize client JavaScript
2. **Type Safety**: End-to-end TypeScript with Zod validation
3. **Action-Based Mutations**: Use Server Actions instead of API routes
4. **Colocation**: Keep related code close (components, types, utilities)
5. **Progressive Enhancement**: App works without JavaScript where possible

---

## Project Structure

```
my-progress/
├── prisma/                    # Database schema and migrations
│   ├── schema.prisma         # Database models and relations
│   └── migrations/           # Migration history
│
├── generated/prisma/         # Auto-generated Prisma Client (git-ignored)
│
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── layout.tsx       # Root layout with providers
│   │   ├── page.tsx         # Home page (tasks dashboard)
│   │   ├── auth/            # Authentication pages
│   │   └── playground/      # Development/testing page
│   │
│   ├── actions/             # Server Actions (mutations)
│   │   ├── task.ts         # Task CRUD operations
│   │   └── user.ts         # User auth and settings
│   │
│   ├── components/          # React components
│   │   ├── auth/           # Login/register forms
│   │   ├── task/           # Task-related components
│   │   ├── editor/         # Lexical rich text editor
│   │   ├── shared/         # Reusable components
│   │   └── ui/             # Base UI primitives (Radix)
│   │
│   ├── contexts/            # React Context providers
│   │   ├── user.context.tsx    # User state management
│   │   └── theme-provider.tsx  # Dark/light theme
│   │
│   ├── lib/                 # Core utilities and setup
│   │   ├── db.ts           # Prisma client singleton
│   │   ├── action-client.ts # Safe action client config
│   │   ├── hash.ts         # Password hashing (bcrypt)
│   │   └── generate-token.ts # JWT generation/verification
│   │
│   ├── helpers/             # Server-side helpers
│   │   └── validate-user.tsx # Auth middleware
│   │
│   ├── utils/               # Utility functions
│   │   ├── cookie.ts       # Cookie management
│   │   ├── calculate-elapsed-time.ts # Time calculations
│   │   └── format-date.ts  # Date formatting
│   │
│   ├── schema/              # Zod validation schemas
│   │   └── user.ts         # User input validation
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── task.ts         # Task-related types
│   │   └── user.ts         # User-related types
│   │
│   ├── constants/           # App constants
│   │   └── status.ts       # Task status constants
│   │
│   ├── paths.ts            # Route path constants
│   └── config.ts           # App configuration
│
├── docker-compose.yml       # PostgreSQL container setup
└── package.json            # Dependencies and scripts
```

---

## Core Patterns & Conventions

### 1. Server Actions Pattern

All data mutations use Server Actions with next-safe-action:

```typescript
// src/actions/task.ts
'use server';

import { actionClient } from '@/lib/action-client';
import { z } from 'zod';

export const createTask = actionClient
  .inputSchema(z.object({ title: z.string() }))
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    
    await prisma.task.create({
      data: { ...parsedInput, userId: user.id }
    });
    
    revalidatePath(paths.home);
  });
```

**Key Points:**
- Always mark files with `'use server'`
- Use `actionClient` for automatic error handling
- Use Zod schemas for input validation
- Call `revalidatePath()` after mutations
- Validate user authentication first

### 2. Type System Pattern

Types are derived from Prisma models:

```typescript
// src/types/task.ts
import type { Task as ITask } from '../../generated/prisma/client';

export type Task = ITask;
export type TaskWithLoggedTime = Awaited<ReturnType<typeof findUserLastWorkingTask>>;
```

**Key Points:**
- Import Prisma-generated types from `generated/prisma/client`
- Use type aliases for clarity
- Derive types from action return types when possible
- Keep type files minimal (no logic)

### 3. Component Pattern

```typescript
// Client Component
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

**Key Points:**
- Use `'use client'` directive for interactive components
- Use `useAction` hook for Server Actions
- Handle loading states with `isPending`
- Handle errors in `onError` callback

### 4. Authentication Flow

```typescript
// 1. Validate token (server-side)
const user = await validateUserToken();

// 2. Access user data
const userData = await prisma.user.findUnique({
  where: { id: user.id }
});

// 3. Use in client components
const { user } = useUserContext();
```

---

## Key Components

### 1. Root Layout (`src/app/layout.tsx`)
- Wraps entire app with providers
- Sets up UserProvider (fetches current user)
- Sets up ThemeProvider (dark/light mode)
- Renders Navbar in Suspense boundary

### 2. User Context (`src/contexts/user.context.tsx`)
- Fetches current user on mount via `me` action
- Provides user data to all client components
- Exposes `refetchUser()` for manual refresh

### 3. Action Client (`src/lib/action-client.ts`)
- Configures next-safe-action error handling
- Returns error messages to client
- Used as base for all Server Actions

### 4. Database Client (`src/lib/db.ts`)
- Singleton Prisma Client instance
- Uses Prisma PG adapter for connection pooling
- Reuses instance in development (prevents connection exhaustion)

### 5. Validation Helper (`src/helpers/validate-user.tsx`)
- Server-side authentication middleware
- Extracts JWT from cookies
- Verifies token and returns user data
- Redirects to `/auth` if invalid

---

## Data Flow

### Task Creation Flow
1. User submits form → triggers `createTask` action
2. Action validates input with Zod schema
3. Action validates user authentication
4. Action fetches user's current project/company
5. Action creates Task + TaskTime records in transaction
6. Action revalidates home path
7. Client receives success/error response
8. UI updates automatically (RSC refresh)

### Authentication Flow
1. User submits login/register form → triggers action
2. Action validates credentials
3. Action generates JWT with user data
4. Action sets HTTP-only cookie with token
5. Action redirects to home page
6. UserProvider fetches user data via `me` action
7. User data available in all client components

### Time Tracking Flow
1. Task starts → TaskTime record created with `from` timestamp
2. Task paused → TaskTime record updated with `to` timestamp
3. Task resumed → New TaskTime record created
4. Task completed → Last TaskTime record updated, task status set
5. Duration calculated from all TaskTime records

---

## Authentication System

### Token Generation (`src/lib/generate-token.ts`)
```typescript
import jwt from 'jsonwebtoken';

export const generateToken = (payload: object) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '12h'
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};
```

### Cookie Management (`src/utils/cookie.ts`)
- HTTP-only cookies for security
- Secure flag in production
- 12-hour expiration
- SameSite: 'lax' for CSRF protection

### User Validation Pattern
```typescript
// In any Server Action
const user = await validateUserToken(); // Throws/redirects if invalid
// Now you have user.id, user.email, user.name
```

---

## Database Layer

### Schema Structure (`prisma/schema.prisma`)

```prisma
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  password       String   # Hashed with bcrypt
  name           String
  currentProject String?
  currentCompany String?
  tasks          Task[]
}

model Task {
  id             String     @id @default(uuid())
  title          String
  status         TaskStatus @default(IN_PROGRESS)
  progress       String?    # Rich text JSON
  todo           String?    # Rich text JSON
  currentProject String?
  currentCompany String?
  
  User       User       @relation(fields: [userId], references: [id])
  userId     String
  loggedTime TaskTime[]
}

model TaskTime {
  id     String    @id @default(uuid())
  from   DateTime  # Start time
  to     DateTime? # End time (null = still active)
  
  Task   Task   @relation(fields: [taskId], references: [id])
  taskId String
}
```

### Key Relationships
- User → Task: One-to-Many
- Task → TaskTime: One-to-Many (for tracking multiple work sessions)

### Common Queries

**Get user's current working task:**
```typescript
const task = await prisma.task.findFirst({
  where: {
    userId: user.id,
    status: { in: ['IN_PROGRESS', 'RESUMED'] }
  },
  include: { loggedTime: true },
  orderBy: { updatedAt: 'desc' }
});
```

**Calculate elapsed time:**
```typescript
const taskTimes = await prisma.taskTime.findMany({
  where: { taskId: task.id }
});
const duration = calculateElapsedTime(taskTimes);
```

---

## Server Actions

### Action Structure
```typescript
'use server';

export const actionName = actionClient
  .inputSchema(zodSchema)
  .action(async ({ parsedInput }) => {
    // 1. Validate user
    const user = await validateUserToken();
    
    // 2. Perform database operations
    const result = await prisma.model.create({
      data: { ...parsedInput, userId: user.id }
    });
    
    // 3. Revalidate paths
    revalidatePath(paths.relevantPage);
    
    // 4. Return data (optional)
    return result;
  });
```

### Current Actions

**Task Actions** (`src/actions/task.ts`):
- `createTask` - Create new task with time tracking
- `updateTask` - Update task status (PAUSED/RESUMED/COMPLETED/CANCELLED)
- `findUserLastWorkingTask` - Get current active task
- `findUserLastTask` - Get last completed task

**User Actions** (`src/actions/user.ts`):
- `createUser` - Register new user
- `loginUser` - Authenticate user
- `me` - Get current user data
- `updateSettings` - Update user settings

### Error Handling
```typescript
const { execute, isPending } = useAction(createTask, {
  onSuccess: ({ data }) => {
    // Handle success
  },
  onError: ({ error }) => {
    // error.serverError contains error message
    console.error(error.serverError);
  }
});
```

---

## Adding New Features

### 1. Add a New Database Model

**Step 1:** Update `prisma/schema.prisma`
```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  
  User   User   @relation(fields: [userId], references: [id])
  userId String
}
```

**Step 2:** Run migration
```bash
pnpm prisma migrate dev --name add_projects
```

**Step 3:** Create type definition (`src/types/project.ts`)
```typescript
import type { Project as IProject } from '../../generated/prisma/client';
export type Project = IProject;
```

### 2. Add a New Server Action

**Step 1:** Create action file (`src/actions/project.ts`)
```typescript
'use server';

import { actionClient } from '@/lib/action-client';
import { validateUserToken } from '@/helpers/validate-user';
import { z } from 'zod';
import prisma from '@/lib/db';

export const createProject = actionClient
  .inputSchema(z.object({
    name: z.string().min(1),
    description: z.string().optional()
  }))
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    
    return await prisma.project.create({
      data: { ...parsedInput, userId: user.id }
    });
  });
```

**Step 2:** Use in component
```typescript
'use client';

import { useAction } from 'next-safe-action/hooks';
import { createProject } from '@/actions/project';

export function ProjectForm() {
  const { execute, isPending } = useAction(createProject);
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      execute({ name: 'New Project' });
    }}>
      {/* Form fields */}
    </form>
  );
}
```

### 3. Add a New Page

**Step 1:** Create page file (`src/app/projects/page.tsx`)
```typescript
import { validateUserToken } from '@/helpers/validate-user';
import prisma from '@/lib/db';

export default async function ProjectsPage() {
  const user = await validateUserToken();
  
  const projects = await prisma.project.findMany({
    where: { userId: user.id }
  });
  
  return (
    <main>
      {/* Render projects */}
    </main>
  );
}
```

**Step 2:** Add route to paths (`src/paths.ts`)
```typescript
export const paths = {
  home: '/',
  auth: '/auth',
  projects: '/projects', // Add this
};
```

**Step 3:** Add navigation link
```typescript
<Link href={paths.projects}>Projects</Link>
```

### 4. Add a New UI Component

**Step 1:** Create component (`src/components/shared/ProjectCard.tsx`)
```typescript
import type { FC } from 'react';
import { Card } from '@/components/ui/card';
import type { Project } from '@/types/project';

type Props = {
  project: Project;
};

export const ProjectCard: FC<Props> = ({ project }) => {
  return (
    <Card>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
    </Card>
  );
};
```

**Step 2:** Import and use
```typescript
import { ProjectCard } from '@/components/shared/ProjectCard';

<ProjectCard project={project} />
```

---

## Common Tasks

### Add Input Validation Schema
```typescript
// src/schema/project.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});
```

### Add Middleware/Guards
```typescript
// Create a new helper
export const requireAdmin = async () => {
  const user = await validateUserToken();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true }
  });
  
  if (!dbUser?.isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return user;
};
```

### Add Database Relation
```typescript
// Update schema.prisma
model Task {
  // ... existing fields
  Project   Project? @relation(fields: [projectId], references: [id])
  projectId String?
}

model Project {
  id    String @id @default(uuid())
  tasks Task[]
}
```

### Add Utility Function
```typescript
// src/utils/calculate-something.ts
export const calculateSomething = (data: SomeType): number => {
  // Implementation
  return result;
};
```

### Add Constant
```typescript
// src/constants/colors.ts
export const PROJECT_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
} as const;

export type ProjectColor = keyof typeof PROJECT_COLORS;
```

---

## Type System

### Type Organization
- **Generated Types**: Import from `generated/prisma/client`
- **Derived Types**: Create in `src/types/`
- **Component Props**: Define inline or in same file
- **Utility Types**: Use TypeScript utility types liberally

### Type Inference Patterns
```typescript
// Infer from Prisma query
type UserWithTasks = Prisma.UserGetPayload<{
  include: { tasks: true }
}>;

// Infer from action return type
type ActionResult = Awaited<ReturnType<typeof someAction>>;

// Infer from array element
type Task = ArrayElement<typeof tasks>;
```

### Strict Type Checking
- All files use strict TypeScript
- No `any` types (use `unknown` if needed)
- All functions have return types
- All props are typed

---

## Best Practices

### 1. Server Actions
✅ **DO:**
- Validate user on every action
- Use Zod for input validation
- Call `revalidatePath()` after mutations
- Handle errors with try-catch or let client handle
- Return typed data

❌ **DON'T:**
- Expose sensitive data in return values
- Forget to validate user authentication
- Miss input validation
- Mutate without revalidation

### 2. Components
✅ **DO:**
- Use Server Components by default
- Add `'use client'` only when needed (hooks, events)
- Use TypeScript for all props
- Extract reusable logic to hooks
- Keep components small and focused

❌ **DON'T:**
- Make everything a Client Component
- Put business logic in components
- Create overly complex component trees
- Forget to memoize expensive computations

### 3. Database Queries
✅ **DO:**
- Use `select` to minimize data transfer
- Use `include` sparingly
- Add indexes for frequently queried fields
- Use transactions for related operations
- Validate user owns resource before mutations

❌ **DON'T:**
- Fetch unnecessary data
- Create N+1 query problems
- Forget to handle null cases
- Skip authorization checks

### 4. File Organization
✅ **DO:**
- Group related files together
- Use index files for cleaner imports
- Keep files focused on single responsibility
- Co-locate tests with source files

❌ **DON'T:**
- Create deeply nested folder structures
- Mix concerns in single file
- Create circular dependencies

### 5. Performance
✅ **DO:**
- Use Server Components for data fetching
- Stream data with Suspense boundaries
- Optimize images with Next.js Image
- Use dynamic imports for large components
- Cache static data

❌ **DON'T:**
- Fetch on client when server can do it
- Block rendering with slow queries
- Load unused code
- Forget to add loading states

---

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/db_name
DB_USER=postgres
DB_PASSWORD=secure_password
DB_NAME=my_progress
DB_PORT=5432

# JWT
JWT_SECRET=your_secret_key_minimum_32_characters

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

---

## Debugging Tips

### 1. Server Action Errors
- Check browser console for `error.serverError`
- Add console.logs in action (visible in terminal)
- Use Prisma Studio to verify database state
- Check network tab for action responses

### 2. Database Issues
```bash
# View database with GUI
pnpx prisma studio

# Check migration status
pnpx prisma migrate status

# Reset database (development only!)
pnpx prisma migrate reset
```

### 3. Type Errors
- Regenerate Prisma Client: `pnpm prisma generate`
- Check tsconfig.json includes generated types
- Restart TypeScript server in VS Code

### 4. Authentication Issues
- Check JWT_SECRET is set
- Verify cookie is being set (DevTools → Application → Cookies)
- Check token expiration
- Verify user exists in database

---

## Testing Guidelines

### Unit Tests
- Test utility functions in isolation
- Test validation schemas
- Mock Prisma for action tests

### Integration Tests
- Test Server Actions with test database
- Test authentication flows
- Test database queries

### E2E Tests
- Test critical user flows
- Test authentication
- Test task creation/completion flow

---

## Performance Considerations

### Database
- Add indexes for foreign keys
- Use connection pooling (Prisma Accelerate in production)
- Optimize queries with `select`
- Use database transactions for related operations

### Frontend
- Minimize client-side JavaScript
- Use Server Components by default
- Lazy load editor components
- Optimize images

### Caching
- Static pages cached automatically
- Use `revalidatePath()` for dynamic updates
- Consider ISR for semi-static content

---

## Security Checklist

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens in HTTP-only cookies
- ✅ User validation on all Server Actions
- ✅ Input validation with Zod
- ✅ SQL injection prevention (Prisma)
- ✅ CSRF protection (SameSite cookies)
- ✅ Secure flag on cookies in production
- ✅ No sensitive data in client components

---

## Deployment Checklist

1. Set all environment variables
2. Run `pnpm prisma migrate deploy`
3. Run `pnpm build`
4. Set `NODE_ENV=production`
5. Configure database connection pooling
6. Set up monitoring/logging
7. Configure CORS if needed
8. Enable HTTPS
9. Set strong JWT_SECRET

---

## Useful Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm prisma studio         # Open database GUI
pnpm prisma generate       # Regenerate Prisma Client

# Database
pnpm prisma migrate dev    # Create and apply migration
pnpm prisma migrate reset  # Reset database (dev only)
pnpm prisma db push        # Push schema without migration

# Code Quality
pnpm lint                  # Run ESLint
pnpm lint:fix              # Fix ESLint issues
pnpm typecheck             # Check TypeScript
pnpm format:write          # Format with Prettier

# Production
pnpm build                 # Build for production
pnpm start                 # Start production server
```

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **next-safe-action**: https://next-safe-action.dev
- **Radix UI**: https://www.radix-ui.com
- **Tailwind CSS**: https://tailwindcss.com
- **Shadcn CSS**: https://ui.shadcn.com/docs

---

**Last Updated**: December 20, 2025
**Version**: 1.0.0
