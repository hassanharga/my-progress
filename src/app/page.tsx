import type { JSX } from 'react';

import { findUserLastCompletedTask, findUserLastWorkingTask } from '@/actions/task';
import Navbar from '@/components/shared/Navbar';
import TaskCard from '@/components/task/Card';
import LastCompletedTask from '@/components/task/LastCompletedTask';

export default async function Home(): Promise<JSX.Element> {
  const [task, completedTask] = await Promise.all([findUserLastWorkingTask(), findUserLastCompletedTask()]);

  return (
    <main className="container w-full flex min-h-screen flex-col items-center gap-3">
      {/* navbar */}
      <Navbar />
      {/* task card */}
      <TaskCard task={task} />
      {/* last completed task */}
      <LastCompletedTask task={completedTask} />
    </main>
  );
}
