import { findUserLastTask, findUserLastWorkingTask, getTaskStats } from '@/actions/task';
import TaskPage from '@/components/task';

export default async function Home() {
  const [task, lastTask, stats] = await Promise.all([findUserLastWorkingTask(), findUserLastTask(), getTaskStats()]);

  return (
    <main className="w-full flex flex-col items-center gap-5 overflow-y-auto p-4 overflow-hidden">
      {/* page details */}
      <TaskPage task={task} lastTask={lastTask} stats={stats} />
    </main>
  );
}
