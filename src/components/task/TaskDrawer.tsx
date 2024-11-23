import type { FC } from 'react';
import { format } from 'date-fns';

import { type TaskWithLoggedTime } from '@/actions/task';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import Status from '../shared/Status';
import { ProgressAndTodo } from './Card';

type Props = {
  task?: TaskWithLoggedTime;
  open: boolean;
  onClose: () => void;
};

const TaskDrawer: FC<Props> = ({ task, open, onClose }) => {
  if (!task) return null;
  return (
    <Sheet open={open} onOpenChange={onClose}>
      {/* <SheetTrigger>Open</SheetTrigger> */}
      <SheetContent side="left" className="w-full md:max-w-[90vw]">
        <SheetHeader>
          <SheetTitle>{task?.title}</SheetTitle>
          {/* <SheetDescription>
            This action cannot be undone. This will permanently delete your account and remove your data from our
            servers.
          </SheetDescription> */}
        </SheetHeader>
        {/* content */}
        <div className="flex flex-col my-6 gap-3">
          <h6>Started at: {format(task?.createdAt, 'yyyy-MM-dd hh:mm aa')}</h6>
          <div>Project: {task?.currentProject || '-'}</div>
          <div className="flex flex-row gap-1 items-center">
            Status: <Status status={task?.status} />
          </div>
          <div>Total Time: {task?.duration}</div>
          {/* progress and todo */}
          <div className="flex flex-col sm:flex-row">
            {/* progress */}
            <ProgressAndTodo title="Completed" text={task?.progress} />
            {/* todo */}
            <ProgressAndTodo title="Todo" text={task?.todo} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskDrawer;
