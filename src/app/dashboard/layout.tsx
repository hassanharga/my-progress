import { Suspense, type ReactNode } from 'react';

import EnhancedNavbar from '@/components/shared/EnhancedNavbar';
import { PageTransition } from '@/components/shared/PageTransition';
import TaskProvider from '@/contexts/task.context';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="h-screen w-screen flex flex-col gap-5">
      <Suspense>
        <EnhancedNavbar />
      </Suspense>
      <TaskProvider>
        <PageTransition>{children}</PageTransition>
      </TaskProvider>
    </div>
  );
}
