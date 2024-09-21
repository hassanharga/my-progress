import type { JSX } from 'react';

import Navbar from '@/components/shared/Navbar';

export default function Home(): JSX.Element {
  return (
    <main className="container w-full flex min-h-screen flex-col items-center justify-between ">
      {/* navbar */}
      <Navbar />
    </main>
  );
}
