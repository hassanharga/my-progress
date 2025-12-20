'use client';

import { type FC, type PropsWithChildren } from 'react';
import { format } from 'date-fns';

import type { LastTaskWithLoggedTime } from '@/types/task';

import Editor from '../shared/Editor';
import Status from '../shared/Status';
import TaskButtons from './Buttons';

type Props = PropsWithChildren & {
  title: string;
  task: LastTaskWithLoggedTime | null;
  showActions?: boolean;
  lastTaskTodo?: string;
  progressLabel: string;
  todoLabel?: string;
};

const TaskCard: FC<Props> = ({ task, title, showActions, lastTaskTodo, progressLabel, todoLabel }) => {
  return (
    <div className="flex flex-col gap-3 border border-gray-300 p-4 rounded-md shadow-md sm:w-125 w-[90vw]">
      <h2 className="text-center font-extrabold">{title}</h2>
      {/* details */}
      {task ? (
        <>
          <div className="flex  flex-col items-start sm:items-center">
            <div className="flex flex-col gap-3 items-start">
              <h4 className="font-bold">{task?.title}</h4>
              <h6>Started at: {format(task?.createdAt, 'yyyy-MM-dd hh:mm aa')}</h6>
              <div>Project: {task?.currentProject || '-'}</div>
              <div className="flex flex-row gap-1 items-center">
                Status: <Status status={task?.status && task?.status === 'RESUMED' ? 'IN_PROGRESS' : task?.status} />
              </div>
              <div>Total Time: {task?.duration}</div>
            </div>
          </div>
          {/* progress and todo */}
          <div className="flex flex-col overflow-hidden">
            {/* progress */}
            <ProgressAndTodo title={progressLabel} text={task?.progress} />
            {/* todo */}
            {!['IN_PROGRESS', 'RESUMED', 'PAUSED'].includes(task.status) ? (
              <ProgressAndTodo title={todoLabel || 'Todo'} text={task?.todo} />
            ) : null}
          </div>
        </>
      ) : null}
      {/* action buttons */}
      {showActions ? <TaskButtons task={task} lastTaskTodo={lastTaskTodo} /> : null}
    </div>
  );
};

export const ProgressAndTodo: FC<{ title: string; text: string | null }> = ({ title, text }) => {
  return (
    <div className="flex flex-col gap-1 p-1 flex-1 w-full">
      <h6 className="font-medium">{title}</h6>

      {text ? (
        <Editor defaultValue={text} disabled />
      ) : (
        <div className="border rounded-sm p-1 text-sm text-center">No Data</div>
      )}
    </div>
  );
};

export default TaskCard;
