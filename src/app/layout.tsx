import { Suspense, type JSX, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import TaskProvider from '@/contexts/task.context';
import ThemeProvider from '@/contexts/theme-provider';
import UserProvider from '@/contexts/user.context';
import EnhancedNavbar from '@/components/shared/EnhancedNavbar';
import { PageTransition } from '@/components/shared/PageTransition';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My progress',
  description: 'Manage my progress for my projects',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UserProvider>
            <div className="h-screen w-screen flex flex-col gap-5">
              {/* navbar */}
              <Suspense>
                <EnhancedNavbar />
              </Suspense>
              <TaskProvider>
                <PageTransition>{children}</PageTransition>
              </TaskProvider>
            </div>
            <Toaster position="top-right" richColors />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
