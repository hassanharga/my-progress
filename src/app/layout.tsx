import type { JSX, ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

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
    <html lang="en">
      <body className={`${inter.className} overflow-hidden`}>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
