import type { Metadata } from 'next';

import { config } from '@/config';
import { generateOrganizationSchema, generateWebPageSchema, JsonLd } from '@/lib/structured-data';
import { findUserLastTask, findUserLastWorkingTask, getTaskStats } from '@/actions/task';
import TaskPage from '@/components/task';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View and manage your current tasks, track work progress, and analyze productivity statistics.',
  openGraph: {
    title: 'Dashboard | My Progress',
    description: 'View and manage your current tasks, track work progress, and analyze productivity statistics.',
    url: config.site.url,
  },
};

export default async function Home() {
  const [task, lastTask, stats] = await Promise.all([findUserLastWorkingTask(), findUserLastTask(), getTaskStats()]);

  return (
    <>
      <JsonLd data={generateOrganizationSchema()} />
      <JsonLd
        data={generateWebPageSchema(
          'Dashboard | My Progress',
          'View and manage your current tasks, track work progress, and analyze productivity statistics.',
          config.site.url
        )}
      />
      <main className="w-full flex flex-col items-center gap-5 overflow-y-auto p-4 overflow-hidden">
        {/* page details */}
        <TaskPage task={task} lastTask={lastTask} stats={stats} />
      </main>
    </>
  );
}
