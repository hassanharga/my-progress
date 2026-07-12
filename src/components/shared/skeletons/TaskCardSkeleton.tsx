import { Skeleton } from '@/components/ui/skeleton';

export const TaskCardSkeleton = () => (
  <div className="relative flex items-center rounded-lg border bg-surface p-150 pl-200">
    {/* Status stripe */}
    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-surface-container" />

    <div className="flex flex-1 flex-col gap-050 min-w-0">
      {/* Top row: title + duration */}
      <div className="flex items-center justify-between gap-100">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Bottom row: badge + date */}
      <div className="flex items-center gap-075">
        <Skeleton className="h-5 w-20 rounded-xs" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  </div>
);
