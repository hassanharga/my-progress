import { type JSX, type ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

import './globals.css';

import { config } from '@/config';
import ThemeProvider from '@/contexts/theme-provider';
import UserProvider from '@/contexts/user.context';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: config.site.url,
  title: {
    default: config.site.title,
    template: `%s | ${config.site.name}`,
  },
  description: config.site.description,
  keywords: config.site.keywords,
  authors: [
    {
      name: config.site.name,
      url: config.site.url,
    },
  ],
  creator: config.site.name,
  publisher: config.site.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: config.site.locale,
    url: config.site.url,
    siteName: config.site.name,
    title: config.site.title,
    description: config.site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: config.site.title,
    description: config.site.description,
    site: config.site.twitterHandle,
    creator: config.site.twitterCreator,
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  alternates: {
    canonical: config.site.url,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UserProvider>
            {children}
            <Toaster position="top-right" richColors />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
