import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-bold/10">
        <span className="font-sans text-4xl font-bold text-text-brand">404</span>
      </div>
      <div className="space-y-2">
        <h1 className="font-sans text-2xl font-bold">Page not found</h1>
        <p className="text-text-subtle">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      </div>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
