<!--
Sync Impact Report:
Version: 1.0.0 → 1.1.0 (MINOR - Added UI/UX, Accessibility, Server-First, and SEO principles)
Modified Principles: N/A (all original principles retained)
Added Sections:
  - Principle VI: Component Library First (shadcn/ui)
  - Principle VII: Accessibility (a11y)
  - Principle VIII: UI/UX Excellence
  - Principle IX: Server-First Architecture
  - Principle X: SEO & Discoverability
Removed Sections: N/A
Templates Updated:
  - plan-template.md: ✅ Verified - Constitution Check section present
  - spec-template.md: ✅ Verified - Requirements align with general structure
  - tasks-template.md: ✅ Verified - User story organization compatible
Follow-up TODOs: None
-->

# My Progress Constitution

## Core Principles

### I. User Data Privacy & Security

- All user data MUST be protected with secure authentication (JWT-based as of current implementation)
- Passwords MUST be hashed before storage
- User data MUST be scoped to the authenticated user - no cross-user data access
- Session management MUST be secure with appropriate token expiration
- Security patches MUST be applied promptly

**Rationale**: This application handles personal productivity data, task history, and time logs. Users trust the system with sensitive work patterns and deliverable information. Privacy is non-negotiable.

### II. Type Safety & Validation

- All code MUST use TypeScript with strict mode enabled
- All external inputs MUST be validated using Zod schemas before processing
- Database operations MUST use Prisma with type-safe queries
- API boundaries MUST have validation layers (server actions with Zod)
- Type errors MUST block deployment

**Rationale**: Type safety prevents entire classes of runtime errors. With user data at stake, invalid data cannot corrupt the database or cause crashes.

### III. Progressive Feature Development

- Features MUST be built as independent, completable units
- Each user story MUST be independently testable and deployable
- User stories MUST be prioritized (P1, P2, P3) for MVP-focused delivery
- Features SHOULD NOT block other features unless genuinely dependent
- Continuous deployment MUST be possible at any checkpoint

**Rationale**: Enables incremental delivery. Freelancers need core task tracking first; enhancements can follow. Prevents "big bang" releases that delay value.

### IV. Developer Experience & Maintainability

- Code MUST follow clear structure: actions/, app/, components/, lib/, schema/, types/
- Components MUST be reusable where appropriate
- Documentation MUST exist for complex features
- Linting and formatting MUST pass before commits
- Naming MUST be descriptive and consistent

**Rationale**: Single-developer and small-team productivity. Clear structure reduces cognitive load. Consistency prevents "where is that file?" friction.

### V. Observability

- User-facing errors MUST be clear and actionable
- Server actions MUST log appropriately for debugging
- Time tracking data MUST be accurate and verifiable by users
- Performance issues MUST be identifiable (not "why is this slow?" black boxes)

**Rationale**: Users need to trust their time logs. When something goes wrong, developers need to diagnose quickly without guessing.

### VI. Component Library First

- **shadcn/ui is PRIMARY**: ALWAYS check [shadcn/ui](https://ui.shadcn.com) before creating new components
- Use `npx shadcn@latest add <component>` to install shadcn components
- Customize shadcn components in `src/components/ui/` as needed
- Only use external component libraries if shadcn doesn't provide the component
- Components are copied into the project (not npm packages) for full ownership

**Rationale**: shadcn/ui provides accessible, customizable components built on Radix UI. Don't reinvent wheels or install heavy dependencies when quality components exist.

### VII. Accessibility (a11y)

- All interactive elements MUST have ARIA labels where context is unclear
- Keyboard navigation MUST work throughout the application
- Focus indicators MUST be visible with high contrast
- Screen reader support MUST be tested for critical flows
- Animations MUST respect `prefers-reduced-motion` for users who request it
- Touch targets MUST be at minimum 44x44px for mobile

**Rationale**: Inclusive design is non-negotiable. Productivity tools should work for everyone, regardless of how they interact with technology.

### VIII. UI/UX Excellence

- Loading states MUST use skeleton loaders, not spinners
- Empty states MUST be helpful with icons, descriptions, and action buttons
- User actions MUST provide feedback via toast notifications (success/error/info/warning)
- Animations SHOULD be subtle and purposeful (not distracting)
- Responsive design MUST support mobile (320px-768px), tablet (768px-1024px), and desktop (1024px+)
- Page transitions SHOULD use smooth fade/slide effects
- Design tokens (spacing, colors, shadows) MUST be consistent

**Rationale**: Professional polish builds trust. Thoughtful micro-interactions and loading states transform "it works" into "it feels great."

### IX. Server-First Architecture

- Use Server Components by default; add `'use client'` only when necessary
- Data fetching SHOULD happen on the server whenever possible
- Use Server Actions (next-safe-action) for mutations instead of API routes
- Minimize client-side JavaScript to improve performance
- Use Suspense boundaries for streaming and loading states

**Rationale**: Next.js 16 App Router optimizes for server-side rendering. Server Components reduce bundle size, improve SEO, and deliver faster initial loads.

### X. SEO & Discoverability

- All pages MUST have appropriate metadata (title, description, keywords)
- Open Graph tags MUST be present for social media sharing
- Sitemap MUST be generated dynamically (`src/app/sitemap.ts`)
- Robots.txt MUST guide search engine crawlers appropriately
- Public pages SHOULD use semantic HTML with proper heading hierarchy
- Images MUST include alt text for accessibility and SEO

**Rationale**: Even productivity tools benefit from discoverability. Proper SEO ensures users can find the application through search and social sharing looks professional.

## Development Workflow

### Feature Development

1. Specification: Use `/speckit.specify` to create feature spec with prioritized user stories
2. Planning: Use `/speckit.plan` to generate technical plan and validate against constitution
3. Tasks: Use `/speckit.tasks` to generate dependency-ordered task list
4. Implementation: Execute tasks following the prioritized user story order
5. Validation: Ensure each user story works independently before proceeding

### Component Development

1. Check shadcn/ui: Visit https://ui.shadcn.com to see if component exists
2. If exists: Install with `npx shadcn@latest add <component-name>`
3. If not: Create custom component using shadcn components as building blocks
4. Ensure accessibility: ARIA labels, keyboard nav, focus indicators
5. Add loading states: Skeletons, not spinners
6. Add responsive behavior: Test mobile, tablet, desktop breakpoints

### Code Quality Gates

- TypeScript compilation MUST pass (`pnpm typecheck`)
- Linting MUST pass (`pnpm lint`)
- Tests (if present) MUST pass
- Database migrations MUST be reversible and documented
- Accessibility audit MUST pass for new UI components

## Technology Constraints

### Fixed Stack (Changes Require Justification)

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Library**: shadcn/ui (PRIMARY) built on Radix UI primitives
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Forms**: React Hook Form + Zod
- **Server Actions**: next-safe-action
- **Animations**: Framer Motion
- **Toast**: Sonner

### Adding Dependencies

- New packages MUST be necessary (no duplication of existing functionality)
- New packages MUST be actively maintained
- New packages MUST not introduce security vulnerabilities
- New dependencies SHOULD be discussed in spec/planning phase

## Architecture Patterns

### Server Actions Pattern

All data mutations use Server Actions with next-safe-action:

```typescript
'use server';

import { actionClient } from '@/lib/action-client';
import { z } from 'zod';

export const createTask = actionClient
  .inputSchema(z.object({ title: z.string() }))
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    // ... implementation
    revalidatePath(paths.home);
  });
```

**Key Points:**
- Always mark files with `'use server'`
- Use `actionClient` for automatic error handling
- Use Zod schemas for input validation
- Call `revalidatePath()` after mutations
- Validate user authentication first

### Type System Pattern

Types are derived from Prisma models:

```typescript
import type { Task as ITask } from '../../generated/prisma/client';

export type Task = ITask;
export type TaskWithLoggedTime = Awaited<ReturnType<typeof findUserLastWorkingTask>>;
```

**Key Points:**
- Import Prisma-generated types from `generated/prisma/client`
- Use type aliases for clarity
- Derive types from action return types when possible
- Keep type files minimal (no logic)

## Design System

### Design Tokens

Located in `src/constants/design-system.ts`:

- **Spacing**: 4px grid system (xs, sm, md, lg, xl, 2xl)
- **Border Radius**: Consistent rounded corners (sm, md, lg, xl, full)
- **Shadows**: Elevation hierarchy (sm, md, lg, xl)
- **Animations**: Durations (fast, normal, slow) and easings (easeIn, easeOut, easeInOut, spring)
- **Colors**: Status colors for task states (IN_PROGRESS, PAUSED, RESUMED, COMPLETED, CANCELLED)

### Responsive Breakpoints

- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

## Governance

### Amendment Process

1. Propose amendment with rationale
2. Update version following semantic versioning:
   - MAJOR: Remove/redefine core principles
   - MINOR: Add new principle or section
   - PATCH: Clarifications, wording improvements
3. Verify all dependent templates remain consistent
4. Document change in Sync Impact Report

### Compliance Review

- All plans (plan.md) MUST pass Constitution Check before implementation
- Features violating principles MUST justify in Complexity Tracking table
- Security violations MUST be addressed before merge
- Accessibility issues MUST be addressed before merge

### Version History

- v1.0.0 (2025-01-18): Initial constitution ratification
- v1.1.0 (2025-01-18): Added UI/UX, Accessibility, Server-First, and SEO principles from docs folder

**Version**: 1.1.0 | **Ratified**: 2025-01-18 | **Last Amended**: 2025-01-18
