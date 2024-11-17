'use client';

import { type FC, type PropsWithChildren } from 'react';
import { format } from 'date-fns';

import { type LastTaskWithLoggedTime } from '@/actions/task';

import InlineHTML from '../shared/InlineHtml';
import Status from '../shared/Status';

type Props = PropsWithChildren & {
  title: string;
  task: LastTaskWithLoggedTime | null;
};

const TaskCard: FC<Props> = ({ task, children, title }) => {
  return task ? (
    <div className="flex flex-col  gap-3 border border-gray-300 p-4 rounded-md shadow-md sm:w-[500px] w-[90vw]">
      <h2 className="text-center font-extrabold">{title}</h2>
      <div className="flex flex-col gap-3 items-center">
        <h4 className="font-bold">{task?.title}</h4>
        <h6>Started at: {format(task?.createdAt, 'yyyy-MM-dd hh:mm aa')}</h6>
        <div className="flex flex-row gap-1 items-center">
          Status: <Status status={task?.status} />
        </div>
        <div>Total Time: {task?.duration}</div>
      </div>
      {/* progress and todo */}
      <div className="flex flex-col sm:flex-row">
        {/* progress */}
        <ProgressAndTodo title="Completed" text={task?.progress} />
        {/* todo */}
        <ProgressAndTodo title="Todo" text={task?.todo} />
      </div>
      {children}
    </div>
  ) : null;
};

const ProgressAndTodo: FC<{ title: string; text: string | null }> = ({ title, text }) => {
  return (
    <div className="flex flex-col gap-1 p-1 flex-1">
      <h5 className="font-bold">{title}</h5>

      {text ? (
        <InlineHTML html={text} />
      ) : (
        <div className="border rounded-sm p-1 text-sm text-center">No Content To Show</div>
      )}
    </div>
  );
};

export default TaskCard;
