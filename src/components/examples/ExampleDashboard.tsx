'use client';

import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

import type { LastTaskWithLoggedTime } from '@/types/task';
import { FadeIn, SlideIn, StaggerItem, StaggerList } from '@/components/shared/animations';
import { EmptyState } from '@/components/shared/EmptyState';
import { DashboardSkeleton } from '@/components/shared/skeletons';
import { StatsGrid } from '@/components/shared/StatsCard';
import { EnhancedTaskCard } from '@/components/task/EnhancedCard';

/**
 * Example Dashboard Component
 *
 * This component demonstrates how to use all the new UI enhancement components:
 * - EnhancedTaskCard: Animated task cards with hover effects
 * - StatsGrid: Animated statistics cards
 * - EmptyState: Empty state with icon and action
 * - Skeletons: Loading states
 * - Animations: FadeIn, SlideIn, StaggerList
 * - Toast: Sonner toast notifications
 *
 * Usage in your pages:
 * ```tsx
 * import { StatsGrid } from '@/components/shared/StatsCard';
 * import { EnhancedTaskCard } from '@/components/task/EnhancedCard';
 *
 * export default function MyPage() {
 *   return (
 *     <div>
 *       <StatsGrid totalTime="24h 30m" completedTasks={12} activeTasks={3} thisWeekTime="8h 15m" />
 *       <EnhancedTaskCard task={myTask} onPlay={handlePlay} onPause={handlePause} />
 *     </div>
 *   );
 * }
 * ```
 */

type Props = {
  tasks?: LastTaskWithLoggedTime[];
  isLoading?: boolean;
};

export default function ExampleDashboard({
  tasks = [
    {
      id: '7b3bb9ae-d286-4aaa-8f12-0851cc24cc89',
      title: 'enhance task card',
      status: 'COMPLETED',
      currentCompany: '',
      currentProject: 'MY Progress',
      duration: '00:04:11 hours',
      progress: null,
      todo: null,
      createdAt: new Date('2025-12-23T11:29:32.865Z'),
      updatedAt: new Date('2025-12-23T11:39:50.058Z'),
      userId: 'example-user-id',
    },
    {
      id: 'b2ae3cab-c235-4052-825f-db6a9f0df955',
      title: 'Action buttons new UI',
      status: 'COMPLETED',
      currentCompany: '',
      currentProject: 'My Progress',
      duration: '00:04:11 hours',
      progress: null,
      todo: null,
      createdAt: new Date('2025-12-23T11:29:32.865Z'),
      updatedAt: new Date('2025-12-23T11:39:50.058Z'),
      userId: 'example-user-id',
    },
    {
      id: 'b2ae3cab-c235-4052-825f-db6a9f0df955',
      title: 'Action buttons new UI',
      status: 'COMPLETED',
      currentCompany: '',
      currentProject: 'My Progress',
      duration: '00:04:11 hours',
      progress: null,
      todo: null,
      createdAt: new Date('2025-12-23T11:29:32.865Z'),
      updatedAt: new Date('2025-12-23T11:39:50.058Z'),
      userId: 'example-user-id',
    },
  ],
  isLoading = false,
}: Props) {
  const handlePlay = () => {
    toast.success('Task resumed!', {
      description: 'Timer started successfully',
    });
  };

  const handlePause = () => {
    toast.info('Task paused', {
      description: 'Timer paused. Click resume to continue.',
    });
  };

  const handleComplete = () => {
    toast.success('Task completed! 🎉', {
      description: 'Great job! The task has been marked as complete.',
    });
  };

  const handleCreateTask = () => {
    toast.info('Create task', {
      description: 'Opening task creation form...',
    });
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 p-6 flex-1">
      {/* Statistics Section */}
      <FadeIn delay={0}>
        <h2 className="text-2xl font-bold mb-4">Overview</h2>
        <StatsGrid totalTime="24h 30m" completedTasks={12} activeTasks={3} thisWeekTime="8h 15m" />
      </FadeIn>

      {/* Current Task Section */}
      <SlideIn direction="up" delay={0.2}>
        <h2 className="text-2xl font-bold mb-4">Current Task</h2>
        {tasks.length > 0 && tasks[0] ? (
          <EnhancedTaskCard
            task={tasks[0]}
            onPlayAction={() => handlePlay()}
            onPauseAction={() => handlePause()}
            onCompleteAction={() => handleComplete()}
          />
        ) : (
          <EmptyState
            icon={<ClipboardList className="w-16 h-16" />}
            title="No active tasks"
            description="Start tracking your work by creating a new task."
            action={{
              label: 'Create Task',
              onClick: handleCreateTask,
            }}
          />
        )}
      </SlideIn>

      {/* Recent Tasks Section */}
      {tasks.length > 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Tasks</h2>
          <StaggerList staggerDelay={0.1} className="space-y-4">
            {tasks
              .slice(1, 4)
              .filter((task): task is NonNullable<typeof task> => task !== null)
              .map((task) => (
                <StaggerItem key={task.id}>
                  <EnhancedTaskCard
                    task={task}
                    onPlayAction={() => handlePlay()}
                    onPauseAction={() => handlePause()}
                    onCompleteAction={() => handleComplete()}
                  />
                </StaggerItem>
              ))}
          </StaggerList>
        </div>
      )}

      {/* Toast Examples */}
      <div className="mt-8 p-6 border rounded-lg bg-muted/50">
        <h3 className="text-lg font-semibold mb-4">Toast Notification Examples</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toast.success('Success!', { description: 'This is a success message' })}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Success Toast
          </button>
          <button
            onClick={() => toast.error('Error!', { description: 'This is an error message' })}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Error Toast
          </button>
          <button
            onClick={() => toast.info('Info', { description: 'This is an info message' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Info Toast
          </button>
          <button
            onClick={() => toast.warning('Warning!', { description: 'This is a warning message' })}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Warning Toast
          </button>
        </div>
      </div>
    </div>
  );
}
