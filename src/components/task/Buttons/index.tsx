import type { FC } from 'react';

import type { TaskWithLoggedTime } from '@/types/task';
import { useTaskContext } from '@/contexts/task.context';
import { Button } from '@/components/ui/button';

import { CompleteTask } from './CompleteTask';
import { CreateTask } from './CreateTask';

interface TaskButtonsProps {
  task: TaskWithLoggedTime | null;
  lastTaskTodo?: string;
}

const TaskButtons: FC<TaskButtonsProps> = ({ task, lastTaskTodo }) => {
  const { isExecutingCreateTask, isExecutingUpdateTask, updateTask, createTask } = useTaskContext();

  return (
    <div className="flex space-x-2 items-center justify-start sm:justify-center flex-wrap gap-2">
      {/* start new task button */}
      {!task ? (
        <CreateTask createTask={createTask} isExecuting={isExecutingCreateTask} lastTaskTodo={lastTaskTodo || ''} />
      ) : null}

      {/* resume task button */}
      {task?.status === 'PAUSED' ? (
        <Button onClick={() => updateTask({ status: 'RESUMED', id: task.id })} disabled={isExecutingUpdateTask}>
          Resume Task
        </Button>
      ) : null}

      {/* pause & complete & cancel task buttons */}
      {task?.status === 'IN_PROGRESS' || task?.status === 'RESUMED' ? (
        <>
          {/* pause task button */}
          <Button
            onClick={() => updateTask({ status: 'PAUSED', id: task.id })}
            variant="outline"
            disabled={isExecutingUpdateTask}
          >
            Pause Task
          </Button>
          {/* complete task button */}
          <CompleteTask
            completeTask={({ progress, todo }) => updateTask({ status: 'COMPLETED', id: task.id, progress, todo })}
            isExecuting={isExecutingUpdateTask}
            taskProgress={task?.progress}
          />
          {/* cancel task button */}
          <Button
            onClick={() => updateTask({ status: 'CANCELLED', id: task.id })}
            variant="destructive"
            disabled={isExecutingUpdateTask}
          >
            Cancel Task
          </Button>
        </>
      ) : null}
    </div>
  );
};

export default TaskButtons;
