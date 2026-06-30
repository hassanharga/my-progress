import { Skeleton } from '@/components/ui/skeleton';

import { TaskCardSkeleton } from './TaskCardSkeleton';

export const DashboardSkeleton = () => (
  <div className="flex h-screen overflow-hidden">
    {/* Sidebar */}
    <div className="hidden w-60 shrink-0 border-r bg-background md:block">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="ml-2 h-4 w-24" />
      </div>
      {/* Nav items */}
      <div className="space-y-2 p-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      {/* User section */}
      <div className="mt-auto border-t p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-32" />
          </div>
        </div>
      </div>
    </div>

    {/* Main column */}
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <Skeleton className="h-9 w-full max-w-sm rounded-md" />
        <Skeleton className="h-8 w-8 rounded-full" />
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
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);
