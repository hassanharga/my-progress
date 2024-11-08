import type { JSX } from 'react';

import { findUserLastCompletedTask, findUserLastWorkingTask } from '@/actions/task';
import Navbar from '@/components/shared/Navbar';
import TaskCard from '@/components/task/Card';
import LastCompletedTask from '@/components/task/LastCompletedTask';
import TasksList from '@/components/task/List';

export default async function Home(): Promise<JSX.Element> {
  const [task, completedTask] = await Promise.all([findUserLastWorkingTask(), findUserLastCompletedTask()]);

  return (
    <main className="w-full flex flex-col items-center gap-3 p-4 overflow-y-auto">
      {/* navbar */}
      <Navbar />
      {/* task card */}
      <TaskCard task={task} />
      {/* last completed task */}
      <LastCompletedTask task={completedTask} />
      {/* list of latest 10 tasks */}
      <TasksList />
    </main>
  );
}
