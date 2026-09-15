import { type FC, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

import { useTaskContext } from '@/contexts/task.context';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';

import TaskCardRow from './TaskCardRow';

type Props = {
  onOpenTask: (taskId: string, opener: HTMLElement) => void;
};

const List: FC<Props> = ({ onOpenTask }) => {
  const {
    updateTask,
    tasks,
    hasNextPage,
    hasPrevPage,
    isLoadingPage,
    fetchNextPage,
    fetchPrevPage,
    isTaskPending,
  } = useTaskContext();

  if (!tasks) return null;

  if (!tasks?.length) {
    return (
      <EmptyState
        icon={<ClipboardList className="w-10 h-10" />}
        title="No tasks found"
        description="You don't have any tasks yet. Create your first task to get started."
      />
    );
  }

  const handlePlay = (taskId: string, isReady: boolean) => async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isTaskPending(taskId)) return;
    const result = await updateTask({ event: 'START', taskId });
    if (result.ok) toast.success(isReady ? 'Task started' : 'Task resumed');
    else if (result.error) toast.error(result.error);
  };

  const handlePause = (taskId: string) => async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isTaskPending(taskId)) return;
    const result = await updateTask({ event: 'PAUSE', taskId });
    if (result.ok) toast.success('Task paused');
    else if (result.error) toast.error(result.error);
  };

  const handleComplete = (taskId: string) => async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isTaskPending(taskId)) return;
    const result = await updateTask({ event: 'COMPLETE', taskId });
    if (result.ok) toast.success('Task completed');
    else if (result.error) toast.error(result.error);
  };

  return (
    <div className="space-y-050">
      {tasks.map((task, idx) => (
        <TaskCardRow
          key={task.id}
          task={task}
          index={idx}
          isLoading={isTaskPending(task.id)}
          onPlay={handlePlay(task.id, task.status === 'READY')}
          onPause={handlePause(task.id)}
          onComplete={handleComplete(task.id)}
          onOpenDetails={(opener) => onOpenTask(task.id, opener)}
        />
      ))}

      {(hasNextPage || hasPrevPage) && (
        <div className="flex items-center justify-end gap-050 pt-200">
          <Button
            variant="default"
            size="icon-sm"
            disabled={!hasPrevPage || isLoadingPage}
            onClick={async () => {
              const result = await fetchPrevPage();
              if (result.error) toast.error(result.error);
            }}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon-sm"
            disabled={!hasNextPage || isLoadingPage}
            onClick={async () => {
              const result = await fetchNextPage();
              if (result.error) toast.error(result.error);
            }}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default List;
