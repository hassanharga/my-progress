import { Suspense, type ReactNode } from 'react';

import DashboardShell from '@/components/dashboard/DashboardShell';
import { PageTransition } from '@/components/shared/PageTransition';
import TaskProvider from '@/contexts/task.context';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DashboardShell>
      <Suspense>
        <TaskProvider>
          <PageTransition>{children}</PageTransition>
        </TaskProvider>
      </Suspense>
    </DashboardShell>
  );
}
