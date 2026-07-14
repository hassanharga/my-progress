import { type FC, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

import { useTaskContext } from '@/contexts/task.context';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';

import TaskCardRow from './TaskCardRow';

const List: FC = () => {
  const {
    executeGetTaskById,
    updateTask,
    tasks,
    hasNextPage,
    hasPrevPage,
    isLoadingPage,
    fetchNextPage,
    fetchPrevPage,
    isExecutingUpdateTask,
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

  const handlePlay = (taskId: string) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isExecutingUpdateTask) return;
    updateTask({ status: 'RESUMED', id: taskId });
  };

  const handlePause = (taskId: string) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isExecutingUpdateTask) return;
    updateTask({ status: 'PAUSED', id: taskId });
  };

  const handleComplete = (taskId: string) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isExecutingUpdateTask) return;
    updateTask({ status: 'COMPLETED', id: taskId });
  };

  return (
    <div className="space-y-050">
      {tasks.map((task, idx) => (
        <TaskCardRow
          key={task.id}
          task={task}
          index={idx}
          isLoading={isExecutingUpdateTask}
          onPlay={handlePlay(task.id)}
          onPause={handlePause(task.id)}
          onComplete={handleComplete(task.id)}
          onClick={() => executeGetTaskById({ taskId: task.id })}
        />
      ))}

      {(hasNextPage || hasPrevPage) && (
        <div className="flex items-center justify-end gap-050 pt-200">
          <Button
            variant="default"
            size="icon-sm"
            disabled={!hasPrevPage || isLoadingPage}
            onClick={() => fetchPrevPage()}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon-sm"
            disabled={!hasNextPage || isLoadingPage}
            onClick={() => fetchNextPage()}
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
