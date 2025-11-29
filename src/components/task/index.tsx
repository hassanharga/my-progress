'use client';

import type { FC } from 'react';

import { type LastTaskWithLoggedTime, type TaskWithLoggedTime } from '@/actions/task';
import Navbar from '@/components/shared/Navbar';
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
      <TaskCard
        task={task}
        title="Current Task Details"
        progressLabel="To be done in this task"
        lastTaskTodo={lastTask?.todo || ''}
        showActions
      />
      {/* last task */}
      {lastTask ? <TaskCard task={lastTask} progressLabel="Completed" title="Last Task Details" /> : null}
      {/* list of user tasks */}
      <TasksList />
    </>
  );
};

export default TaskDetails;
