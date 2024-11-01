'use client';

import { useMemo, type FC } from 'react';
import { calculateElapsedTime } from '@/utils/calculate-elapsed-time';
import { format } from 'date-fns';

import { type TaskWithLoggedTime } from '@/actions/task';

import TaskButtons from './Buttons';

interface TaskCardProps {
  task: TaskWithLoggedTime | null;
}

const TaskCard: FC<TaskCardProps> = ({ task }) => {
  const taskCreatedAt = useMemo(() => {
    if (!task?.loggedTime) return '';
    return calculateElapsedTime(task?.loggedTime);
  }, [task]);

  return (
    <div className="flex flex-col items-center gap-3 border border-gray-300 p-4 rounded-md shadow-md  sm:w-[500px] w-[90vw]">
      {task ? (
        <div className="flex flex-col gap-3">
          <h4 className="font-bold">{task?.title}</h4>
          <h6>Started at: {format(task?.createdAt, 'yyyy-MM-dd hh:mm aa')}</h6>
          <div>Status: {task?.status}</div>
          <div>Elapsed time: {taskCreatedAt}</div>
        </div>
      ) : null}
      <div>
        <TaskButtons task={task} />
      </div>
    </div>
  );
};

export default TaskCard;
