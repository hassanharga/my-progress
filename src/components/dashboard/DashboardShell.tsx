'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import ApplicationNavigation from './ApplicationNavigation';
import DashboardTopBar from './DashboardTopBar';
import SkipLink from './SkipLink';

type DashboardShellFrameProps = {
  children: ReactNode;
  pathname: string;
  topBar: ReactNode;
};

export function DashboardShellFrame({ children, pathname, topBar }: DashboardShellFrameProps) {
  return (
    <div className="dashboard-shell">
      <SkipLink targetId="dashboard-main-content" />
      <ApplicationNavigation pathname={pathname} placement="wide" />
      <ApplicationNavigation pathname={pathname} placement="medium" />
      <div className="dashboard-workspace">
        {topBar}
        <main id="dashboard-main-content" tabIndex={-1} className="dashboard-main">
          {children}
        </main>
      </div>
      <ApplicationNavigation pathname={pathname} placement="narrow" />
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return <DashboardShellFrame pathname={pathname} topBar={<DashboardTopBar />}>{children}</DashboardShellFrame>;
}
