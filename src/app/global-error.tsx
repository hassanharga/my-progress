'use client';

import { useEffect } from 'react';

import { AlertCircle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    logger.error('Global error boundary caught:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-danger-bold/10">
            <AlertCircle className="h-10 w-10 text-text-danger" />
          </div>
          <div className="space-y-2">
            <h1 className="font-sans text-2xl font-bold">Application Error</h1>
            <p className="text-text-subtle max-w-md">
              {error.message || 'A critical error occurred. Please try again.'}
            </p>
          </div>
          <Button onClick={reset} variant="default">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
