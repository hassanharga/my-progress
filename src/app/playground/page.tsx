import type { Metadata } from 'next';

import { config } from '@/config';

import PlaygroundContent from './playground-content';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Explore UI components and test dashboard features in our interactive playground.',
  openGraph: {
    title: 'Playground | My Progress',
    description: 'Explore UI components and test dashboard features in our interactive playground.',
    url: `${config.site.url}/playground`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlaygroundPage() {
  return <PlaygroundContent />;
}
