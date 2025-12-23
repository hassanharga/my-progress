import { Skeleton } from '@/components/ui/skeleton';

import { TaskCardSkeleton } from './TaskCardSkeleton';

export const DashboardSkeleton = () => (
  <div className="space-y-8">
    {/* Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border rounded-xl p-6 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>

    {/* Current Task */}
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <TaskCardSkeleton />
    </div>

    {/* Task List */}
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);
