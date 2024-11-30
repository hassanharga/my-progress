import type { JSX, ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import ThemeProvider from '@/components/contexts/theme-provider';
import UserProvider from '@/components/contexts/user.context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My progress',
  description: 'help me to manage my progress for my projects',
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
          <UserProvider>{children}</UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
