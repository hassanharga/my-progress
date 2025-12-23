# UI Enhancement Components - Usage Guide

This document provides examples and best practices for using all the new UI enhancement components.

---

## 📦 Available Components

### 1. **Animation Components**
Location: `src/components/shared/animations/`

#### FadeIn
Fades in content with optional slide up effect.

```tsx
import { FadeIn } from '@/components/shared/animations';

<FadeIn delay={0.2} duration={0.3}>
  <YourContent />
</FadeIn>
```

**Props:**
- `delay?: number` - Animation delay in seconds (default: 0)
- `duration?: number` - Animation duration in seconds (default: 0.25)
- All standard div props

#### ScaleIn
Scales in content with spring animation.

```tsx
import { ScaleIn } from '@/components/shared/animations';

<ScaleIn delay={0.1}>
  <YourContent />
</ScaleIn>
```

#### SlideIn
Slides in content from any direction.

```tsx
import { SlideIn } from '@/components/shared/animations';

<SlideIn direction="left" delay={0}>
  <YourContent />
</SlideIn>
```

**Props:**
- `direction?: 'left' | 'right' | 'up' | 'down'` (default: 'up')
- `delay?: number`

#### StaggerList & StaggerItem
Creates staggered animations for lists.

```tsx
import { StaggerList, StaggerItem } from '@/components/shared/animations';

<StaggerList staggerDelay={0.1} className="space-y-4">
  {items.map((item) => (
    <StaggerItem key={item.id}>
      <ItemComponent item={item} />
    </StaggerItem>
  ))}
</StaggerList>
```

---

### 2. **EnhancedTaskCard**
Location: `src/components/task/EnhancedCard.tsx`

Animated task card with hover effects, status indicators, and quick actions.

```tsx
import { EnhancedTaskCard } from '@/components/task/EnhancedCard';

<EnhancedTaskCard
  task={task}
  onPlay={() => handlePlay(task.id)}
  onPause={() => handlePause(task.id)}
  onComplete={() => handleComplete(task.id)}
  onEdit={() => handleEdit(task.id)}
  onDelete={() => handleDelete(task.id)}
/>
```

**Features:**
- ✅ Status indicator stripe (left edge)
- ✅ Hover scale animation
- ✅ Status badge with colors
- ✅ Duration and date display
- ✅ Animated progress bar for active tasks
- ✅ Quick action buttons (Play/Pause/Complete)
- ✅ Dropdown menu for edit/delete

---

### 3. **Statistics Cards**
Location: `src/components/shared/StatsCard.tsx`

#### StatCard (Individual)
```tsx
import { StatCard } from '@/components/shared/StatsCard';
import { Clock } from 'lucide-react';

<StatCard
  title="Total Time"
  value="24h 30m"
  icon={<Clock className="h-4 w-4" />}
  description="All time tracked"
  trend={{ value: '+12%', isPositive: true }}
  delay={0.1}
/>
```

#### StatsGrid (Pre-built Grid)
```tsx
import { StatsGrid } from '@/components/shared/StatsCard';

<StatsGrid
  totalTime="24h 30m"
  completedTasks={12}
  activeTasks={3}
  thisWeekTime="8h 15m"
/>
```

**Features:**
- ✅ Animated entrance
- ✅ Animated counter scale
- ✅ Trend indicators with arrows
- ✅ Hover effects
- ✅ Responsive grid layout

---

### 4. **Loading Skeletons**
Location: `src/components/shared/skeletons/`

#### TaskCardSkeleton
```tsx
import { TaskCardSkeleton } from '@/components/shared/skeletons';

{isLoading ? <TaskCardSkeleton /> : <TaskCard task={task} />}
```

#### DashboardSkeleton
```tsx
import { DashboardSkeleton } from '@/components/shared/skeletons';

{isLoading ? <DashboardSkeleton /> : <YourDashboard />}
```

---

### 5. **Empty State**
Location: `src/components/shared/EmptyState.tsx`

```tsx
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';

<EmptyState
  icon={<ClipboardList className="w-16 h-16" />}
  title="No tasks yet"
  description="Create your first task to start tracking your work."
  action={{
    label: 'Create Task',
    onClick: handleCreateTask
  }}
/>
```

**Props:**
- `icon?: ReactNode` - Optional icon to display
- `title: string` - Main heading
- `description: string` - Descriptive text
- `action?: { label: string; onClick: () => void }` - Optional action button

---

### 6. **Page Transitions**
Location: `src/components/shared/PageTransition.tsx`

Wrap your page content for smooth transitions between routes.

```tsx
// In your layout.tsx or page component
import { PageTransition } from '@/components/shared/PageTransition';

export default function Layout({ children }) {
  return (
    <PageTransition>
      {children}
    </PageTransition>
  );
}
```

**Features:**
- ✅ Automatic page transition on route change
- ✅ Fade + slide animation
- ✅ Works with Next.js App Router

---

### 7. **Toast Notifications**
Using Sonner (already integrated in layout)

```tsx
import { toast } from 'sonner';

// Success
toast.success('Task completed!', {
  description: 'Great job! The task has been marked as complete.'
});

// Error
toast.error('Failed to save', {
  description: 'Please try again later.'
});

// Info
toast.info('New feature available', {
  description: 'Check out the new dashboard!'
});

// Warning
toast.warning('Unsaved changes', {
  description: 'You have unsaved changes. Save before leaving?'
});

// Loading
const toastId = toast.loading('Processing...');
// Later...
toast.success('Done!', { id: toastId });

// With action button
toast('New notification', {
  description: 'You have a new message',
  action: {
    label: 'View',
    onClick: () => console.log('View clicked')
  }
});
```

---

### 8. **Enhanced Navbar**
Location: `src/components/shared/EnhancedNavbar.tsx`

Already created and ready to replace the old navbar.

**Features:**
- ✅ User avatar with dropdown menu
- ✅ Theme switcher (Light/Dark/System)
- ✅ Search bar placeholder (for future command palette)
- ✅ Settings integration
- ✅ Responsive design
- ✅ Sticky header with backdrop blur

**To use:**
```tsx
// Replace Navbar import in layout.tsx
import EnhancedNavbar from '@/components/shared/EnhancedNavbar';

<EnhancedNavbar />
```

---

## 🎨 Design System

### Colors
Location: `src/constants/design-system.ts`

```tsx
import { STATUS_COLORS, PRIORITY_COLORS } from '@/constants/design-system';

// Status colors
const statusStyle = STATUS_COLORS['IN_PROGRESS'];
<div className={statusStyle.bg}>...</div>
<span className={statusStyle.text}>...</span>

// Priority colors
const priorityStyle = PRIORITY_COLORS['HIGH'];
```

### Design Tokens
```tsx
import { DESIGN_TOKENS } from '@/constants/design-system';

// Spacing
DESIGN_TOKENS.spacing['4'] // '1rem' (16px)

// Border Radius
DESIGN_TOKENS.borderRadius.lg // '0.75rem'

// Shadows
DESIGN_TOKENS.shadows.md

// Animations
DESIGN_TOKENS.animations.durations.normal // '250ms'
DESIGN_TOKENS.animations.easings.easeOut

// Z-index
DESIGN_TOKENS.zIndex.modal // 1400
```

---

## 📖 Complete Usage Example

```tsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';

import { EnhancedTaskCard } from '@/components/task/EnhancedCard';
import { StatsGrid } from '@/components/shared/StatsCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { DashboardSkeleton } from '@/components/shared/skeletons';
import { FadeIn, StaggerList, StaggerItem } from '@/components/shared/animations';

export default function MyDashboard() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch tasks
    fetchTasks().then((data) => {
      setTasks(data);
      setIsLoading(false);
    });
  }, []);

  const handlePlayTask = (taskId: string) => {
    toast.success('Task started!');
    // Your logic here
  };

  const handlePauseTask = (taskId: string) => {
    toast.info('Task paused');
    // Your logic here
  };

  const handleCompleteTask = (taskId: string) => {
    toast.success('Task completed! 🎉');
    // Your logic here
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 p-6">
      {/* Stats */}
      <FadeIn>
        <h2 className="text-2xl font-bold mb-4">Overview</h2>
        <StatsGrid
          totalTime="24h 30m"
          completedTasks={12}
          activeTasks={3}
          thisWeekTime="8h 15m"
        />
      </FadeIn>

      {/* Tasks */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Your Tasks</h2>
        {tasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-16 h-16" />}
            title="No tasks yet"
            description="Create your first task to get started."
            action={{
              label: 'Create Task',
              onClick: () => toast.info('Opening task form...')
            }}
          />
        ) : (
          <StaggerList className="space-y-4">
            {tasks.map((task) => (
              <StaggerItem key={task.id}>
                <EnhancedTaskCard
                  task={task}
                  onPlay={() => handlePlayTask(task.id)}
                  onPause={() => handlePauseTask(task.id)}
                  onComplete={() => handleCompleteTask(task.id)}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
```

---

## 🎯 Best Practices

### 1. **Use Skeletons for Loading States**
Always show skeleton loaders instead of spinners or empty space.

```tsx
{isLoading ? <TaskCardSkeleton /> : <TaskCard />}
```

### 2. **Add Animations Thoughtfully**
Don't overdo it. Use subtle delays to create hierarchy:

```tsx
<FadeIn delay={0}>Header</FadeIn>
<FadeIn delay={0.1}>Stats</FadeIn>
<FadeIn delay={0.2}>Content</FadeIn>
```

### 3. **Provide User Feedback**
Use toasts for all user actions:

```tsx
toast.success('Task created!');
toast.error('Failed to save');
```

### 4. **Handle Empty States**
Always provide helpful empty states with actions:

```tsx
<EmptyState
  title="No data"
  description="Helpful message"
  action={{ label: 'Action', onClick: handler }}
/>
```

### 5. **Respect User Preferences**
The design system respects `prefers-reduced-motion`. Animations will be disabled automatically for users who prefer reduced motion.

---

## 🚀 Next Steps

Now that you have all these components, you can:

1. **Replace old components** with enhanced versions
2. **Add page transitions** to your routes
3. **Implement toast notifications** throughout the app
4. **Build new dashboard layouts** with stats cards
5. **Create command palette** (⌘K) using shadcn command component
6. **Add more micro-interactions** where needed

---

## 📚 Additional Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Sonner Toast](https://sonner.emilkowal.ski/)
- [Lucide Icons](https://lucide.dev)

---

**Last Updated**: December 22, 2025
