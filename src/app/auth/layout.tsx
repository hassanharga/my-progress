import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Sign in to your account or create a new one to start tracking your progress.',
  openGraph: {
    title: 'Authentication | My Progress',
    description: 'Sign in to your account or create a new one to start tracking your progress.',
    url: `${config.site.url}/auth`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
