'use client';

import type { FC } from 'react';

import { type LastTaskWithLoggedTime, type TaskWithLoggedTime } from '@/actions/task';
import Navbar from '@/components/shared/Navbar';
// import LastCompletedTask from '@/components/task/Card';
import TaskButtons from '@/components/task/Buttons';
import TaskCard from '@/components/task/Card';
import TasksList from '@/components/task/List';

type Props = {
  task: TaskWithLoggedTime | null;
  lastTask: LastTaskWithLoggedTime | null;
};

const TaskDetails: FC<Props> = ({ task, lastTask }) => {
  return (
    <>
      {/* navbar */}
      <Navbar />
      {/* task card */}
      <TaskCard task={task} title="Current Task Details">
        {/* buttons */}
        <div>
          <TaskButtons task={task} />
        </div>
      </TaskCard>
      {/* last task */}
      <TaskCard task={lastTask} title="Last Task Details" />
      {/* list of user tasks */}
      <TasksList />
    </>
  );
};

export default TaskDetails;
