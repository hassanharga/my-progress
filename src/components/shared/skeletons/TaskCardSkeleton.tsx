import { Skeleton } from '@/components/ui/skeleton';

export const TaskCardSkeleton = () => (
  <div className="border rounded-xl p-6 space-y-4">
    <div className="flex items-start justify-between">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
    <div className="flex gap-2">
      <Skeleton className="h-8 w-16 rounded-md" />
      <Skeleton className="h-8 w-16 rounded-md" />
    </div>
  </div>
);
