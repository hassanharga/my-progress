import { Suspense, type JSX, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import TaskProvider from '@/contexts/task.context';
import ThemeProvider from '@/contexts/theme-provider';
import UserProvider from '@/contexts/user.context';
import Navbar from '@/components/shared/Navbar';

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
      <body className={`${inter.className} overflow-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UserProvider>
            <div className="h-screen w-screen flex flex-col gap-5">
              {/* navbar */}
              <Suspense>
                <Navbar />
              </Suspense>
              <TaskProvider>{children}</TaskProvider>
            </div>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
