import { Suspense, type ReactNode } from 'react';

import DashboardShell from '@/components/dashboard/DashboardShell';
import { PageTransition } from '@/components/shared/PageTransition';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DashboardShell>
      <Suspense>
        <PageTransition>{children}</PageTransition>
      </Suspense>
    </DashboardShell>
  );
}
