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
