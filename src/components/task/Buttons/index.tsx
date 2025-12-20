import type { FC } from 'react';
import { useAction } from 'next-safe-action/hooks';

import type { TaskWithLoggedTime } from '@/types/task';
import { createTask, updateTask } from '@/actions/task';
import { Button } from '@/components/ui/button';

import { CompleteTask } from './CompleteTask';
import { CreateTask } from './CreateTask';

interface TaskButtonsProps {
  task: TaskWithLoggedTime | null;
  lastTaskTodo?: string;
}

const TaskButtons: FC<TaskButtonsProps> = ({ task, lastTaskTodo }) => {
  const { executeAsync: executeCreateTask, isExecuting } = useAction(createTask);
  const { executeAsync: executeUpdateTask } = useAction(updateTask);

  const onStartTask = async ({
    title,
    progress,
    project,
  }: {
    title: string;
    progress: string;
    project: string;
  }): Promise<void> => {
    if (!title?.trim()) return;
    await executeCreateTask({ title, progress, project });
  };

  const updateTaskHandler = async (data: {
    status: 'PAUSED' | 'RESUMED' | 'COMPLETED' | 'CANCELLED';
    id: string;
    progress?: string;
    todo?: string;
  }): Promise<void> => {
    await executeUpdateTask(data);
  };

  const onPauseTask = async (): Promise<void> => {
    if (!task) return;
    await updateTaskHandler({ status: 'PAUSED', id: task.id });
  };

  const onResumeTask = async (): Promise<void> => {
    if (!task) return;
    await updateTaskHandler({ status: 'RESUMED', id: task.id });
  };

  const onCancelTask = async (): Promise<void> => {
    if (!task) return;
    await updateTaskHandler({ status: 'CANCELLED', id: task.id });
  };

  const onCompleteTask = async ({ progress, todo }: { progress: string; todo: string }): Promise<void> => {
    if (!task) return;
    await updateTaskHandler({ status: 'COMPLETED', id: task.id, progress, todo });
  };

  return (
    <div className="flex space-x-2 items-center justify-start sm:justify-center flex-wrap gap-2">
      {/* start new task button */}
      {!task ? (
        <CreateTask createTask={onStartTask} isExecuting={isExecuting} lastTaskTodo={lastTaskTodo || ''} />
      ) : null}

      {/* resume task button */}
      {task?.status === 'PAUSED' ? <Button onClick={onResumeTask}>Resume Task</Button> : null}

      {/* pause & complete & cancel task buttons */}
      {task?.status === 'IN_PROGRESS' || task?.status === 'RESUMED' ? (
        <>
          {/* pause task button */}
          <Button onClick={onPauseTask} variant="outline">
            Pause Task
          </Button>
          {/* complete task button */}
          <CompleteTask completeTask={onCompleteTask} isExecuting={isExecuting} taskProgress={task?.progress} />
          {/* cancel task button */}
          <Button onClick={onCancelTask} variant="destructive">
            Cancel Task
          </Button>
        </>
      ) : null}
    </div>
  );
};

export default TaskButtons;
