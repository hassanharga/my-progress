import type { Metadata } from 'next';
import { validateUserToken } from '@/helpers/validate-user';
import { FolderOpen } from 'lucide-react';

import db from '@/lib/db';
import { getTasksListData, getTaskStats } from '@/actions/task';
import TaskProvider from '@/contexts/task.context';
import { EmptyState } from '@/components/shared/EmptyState';
import TaskPage from '@/components/task';
import { TODAY_PRESENTATION } from './today-presentation';

export const metadata: Metadata = TODAY_PRESENTATION;

function getGreeting() {
  const hours = new Date().getHours();
  if (hours < 12) return 'Good morning';
  if (hours < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function Dashboard() {
  const user = await validateUserToken();

  const userData = await db.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });

  // No active project -> empty state prompting project creation via the sidebar switcher.
  if (!userData?.currentProjectId) {
    return (
      <section aria-labelledby="today-heading" className="mx-auto w-full max-w-7xl p-200 sm:p-300 lg:p-400">
        <h1 id="today-heading" className="font-heading text-heading-large text-text">Today</h1>
        <div className="mt-200">
          <EmptyState
            icon={<FolderOpen className="w-16 h-16" />}
            title="No project selected"
            description="Create or select a project from the project switcher in the top bar to start tracking tasks."
          />
        </div>
      </section>
    );
  }

  const [stats, initialTasksData] = await Promise.all([getTaskStats(), getTasksListData(4, null)]);

  const greeting = getGreeting();

  return (
    <>
      <TaskProvider
        key={userData.currentProjectId}
        initialTasks={initialTasksData.tasks}
        initialHasNextPage={initialTasksData.hasNextPage}
        initialNextCursor={initialTasksData.nextCursor}
      >
        <section aria-labelledby="today-heading" className="mx-auto w-full max-w-7xl space-y-300 p-200 sm:p-300 lg:p-400">
          <div>
            <p className="text-body-small font-weight-semibold uppercase tracking-[0.14em] text-text-subtlest">{greeting}, {user.name}</p>
            <h1 id="today-heading" className="mt-050 font-heading text-heading-large text-text">Today</h1>
            <p className="mt-050 text-body text-text-subtle">Here&apos;s your current project&apos;s progress.</p>
          </div>
          <TaskPage stats={stats} />
        </section>
      </TaskProvider>
    </>
  );
}
