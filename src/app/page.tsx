import type { JSX } from 'react';

import { findUserLastTask, findUserLastWorkingTask } from '@/actions/task';
import TaskDetails from '@/components/task';

export default async function Home(): Promise<JSX.Element> {
  const [task, lastTask] = await Promise.all([findUserLastWorkingTask(), findUserLastTask()]);

  return (
    <main className="w-full flex flex-col items-center gap-3 overflow-y-auto">
      {/* page details */}
      <TaskDetails task={task} lastTask={lastTask} />
    </main>
  );
}
