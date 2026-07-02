import { useEffect, useRef, type FC, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';

import { useTaskContext } from '@/contexts/task.context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';

import TaskCardRow from './TaskCardRow';

const List: FC = () => {
  const {
    executeGetTaskById,
    updateTask,
    setPage,
    tasks,
    totalTasks,
    limit,
    page,
    fetchTasks,
    isExecutingUpdateTask,
  } = useTaskContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, page]);

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

  const totalPages = Math.ceil(totalTasks / limit);

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

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-200">
          <span className="text-body-small text-text-subtle">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-050">
            <Button
              variant="default"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default List;
