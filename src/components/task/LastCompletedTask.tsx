import { useMemo, type FC } from 'react';
import { calculateElapsedTime } from '@/utils/calculate-elapsed-time';
import { format } from 'date-fns';

import { type CompletedTaskWithLoggedTime } from '@/actions/task';

type Props = {
  task: CompletedTaskWithLoggedTime | null;
};

const LastCompletedTask: FC<Props> = ({ task }) => {
  const taskCreatedAt = useMemo(() => {
    if (!task?.loggedTime) return '';
    return calculateElapsedTime(task?.loggedTime);
  }, [task]);

  return task ? (
    <div className="flex flex-col  gap-3 border border-gray-300 p-4 rounded-md shadow-md sm:w-[500px] w-[90vw]">
      <h2 className="text-center font-extrabold">Last Completed Task Details</h2>
      <div className="flex flex-col gap-3 items-center">
        <h4 className="font-bold">{task?.title}</h4>
        <h6>Started at: {format(task?.createdAt, 'yyyy-MM-dd hh:mm aa')}</h6>
        <div>Total Time: {taskCreatedAt}</div>
      </div>
      {/* progress and todo */}
      <div className="flex flex-col sm:flex-row">
        {/* progress */}
        <ProgressAndTodo title="Progress" text={task?.progress} />
        {/* todo */}
        <ProgressAndTodo title="Todo" text={task?.todo} />
      </div>
    </div>
  ) : null;
};

const ProgressAndTodo: FC<{ title: string; text: string | null }> = ({ title, text }) => {
  return (
    <div className="flex flex-col gap-1 p-1 flex-1">
      <h5 className="font-bold">{title}</h5>

      {text ? (
        <div dangerouslySetInnerHTML={{ __html: text }} />
      ) : (
        <div className="border rounded-sm p-1 text-sm text-center">No Content To Show</div>
      )}
    </div>
  );
};

export default LastCompletedTask;
