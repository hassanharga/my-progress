import { type FC } from 'react';
import { useAction } from 'next-safe-action/hooks';

import { createTask, updateTask, type TaskWithLoggedTime } from '@/actions/task';
import { Button } from '@/components/ui/button';

import { CompleteTask } from './CompleteTask';
import { CreateTask } from './CreateTask';

interface TaskButtonsProps {
  task: TaskWithLoggedTime | null;
  lastTaskTodo?: string;
}

const TaskButtons: FC<TaskButtonsProps> = ({ task, lastTaskTodo }) => {
  const { execute: executeCreateTask, isExecuting } = useAction(createTask);
  const { execute: executeUpdateTask } = useAction(updateTask);

  const onStartTask = ({ title, progress, project }: { title: string; progress: string; project: string }): void => {
    if (!title?.trim()) return;
    executeCreateTask({ title, progress, project });
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

  const onCompleteTask = ({ progress, todo }: { progress: string; todo: string }): void => {
    if (!task) return;
    executeUpdateTask({ status: 'COMPLETED', id: task.id, progress, todo });
  };

  return (
    <div className="flex space-x-2 items-center justify-center">
      {/* start new task button */}
      {/* {!task ? <Button onClick={onStartTask}>Start Task</Button> : null} */}
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
