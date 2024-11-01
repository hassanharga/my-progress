import { type FC } from 'react';
import { type Task } from '@prisma/client';
import { useAction } from 'next-safe-action/hooks';

import { createTask, updateTask } from '@/actions/task';
import { Button } from '@/components/ui/button';

import { CreateTask } from './CreateTask';

interface TaskButtonsProps {
  task: Task | null;
}

const TaskButtons: FC<TaskButtonsProps> = ({ task }) => {
  const { execute: executeCreateTask, isExecuting } = useAction(createTask);
  const { execute: executeUpdateTask } = useAction(updateTask);

  const onStartTask = (title: string): void => {
    if (!title?.trim()) return;
    executeCreateTask({ title });
  };

  const onPauseTask = (): void => {
    if (!task) return;
    executeUpdateTask({ status: 'PAUSED', id: task.id });
  };

  const onResumeTask = (): void => {
    if (!task) return;
    executeUpdateTask({ status: 'RESUMED', id: task.id });
  };

  const onCancelTask = (): void => {
    if (!task) return;
    executeUpdateTask({ status: 'CANCELLED', id: task.id });
  };

  const onCompleteTask = (): void => {
    // TODO: open a modal to add the progress and todo
    if (!task) return;
    executeUpdateTask({ status: 'COMPLETED', id: task.id, progress: '', todo: '' });
  };

  return (
    <div className="flex space-x-2">
      {/* start new task button */}
      {/* {!task ? <Button onClick={onStartTask}>Start Task</Button> : null} */}
      {!task ? <CreateTask createTask={onStartTask} isExecuting={isExecuting} /> : null}

      {/* pause task button */}
      {task?.status === 'IN_PROGRESS' ? <Button onClick={onPauseTask}>Pause Task</Button> : null}

      {/* resume task button */}
      {task?.status === 'PAUSED' ? <Button onClick={onResumeTask}>Resume Task</Button> : null}

      {/* cancel task button */}
      {task?.status === 'IN_PROGRESS' || task?.status === 'RESUMED' ? (
        <>
          <Button variant="outline" color="success" onClick={onCompleteTask}>
            Complete
          </Button>
          <Button onClick={onCancelTask} variant="destructive">
            Cancel Task
          </Button>
        </>
      ) : null}
    </div>
  );
};

export default TaskButtons;
