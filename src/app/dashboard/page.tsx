import type { Metadata } from 'next';

import { getTaskStats, getTasksListData } from '@/actions/task';
import { validateUserToken } from '@/helpers/validate-user';
import db from '@/lib/db';
import TaskPage from '@/components/task';
import TaskProvider from '@/contexts/task.context';
import { EmptyState } from '@/components/shared/EmptyState';
import { FolderOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View and manage your current tasks, track work progress, and analyze productivity statistics.',
  robots: {
    index: false,
    follow: false,
  },
};

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
      <main className="w-full max-w-7xl overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mt-200">
          <EmptyState
            icon={<FolderOpen className="w-16 h-16" />}
            title="No project selected"
            description="Create or select a project from the sidebar switcher to start tracking tasks."
          />
        </div>
      </main>
    );
  }

  const [stats, initialTasksData] = await Promise.all([
    getTaskStats(),
    getTasksListData(4, null),
  ]);

  const greeting = getGreeting();

  return (
    <>
      <TaskProvider
        initialTasks={initialTasksData.tasks}
        initialHasNextPage={initialTasksData.hasNextPage}
        initialNextCursor={initialTasksData.nextCursor}
      >
        <main className="w-full max-w-7xl space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-heading-large text-text">
              {greeting}, {user.name} 👋
            </h1>
            <p className="text-sm text-text-subtle">Here&apos;s your progress at a glance.</p>
          </div>
          <TaskPage stats={stats} />
        </main>
      </TaskProvider>
    </>
  );
}
