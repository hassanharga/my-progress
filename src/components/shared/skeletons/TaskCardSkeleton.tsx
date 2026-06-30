import { Skeleton } from '@/components/ui/skeleton';

export const TaskCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
    {/* Status stripe */}
    <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted" />

    <div className="space-y-4 p-6 pl-8">
      {/* Title */}
      <div className="flex items-start justify-between">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Progress bar area */}
      <Skeleton className="h-2 w-full rounded-full" />

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  </div>
);
