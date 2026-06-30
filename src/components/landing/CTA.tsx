import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { paths } from '@/paths';

export default function CTA() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
          Start tracking your progress today
        </h2>
        <p className="mx-auto mt-4 max-w-md text-primary-foreground/80">
          Join others who are staying on top of their work, one task at a time.
        </p>
        <Button size="lg" variant="secondary" className="mt-8" asChild>
          <Link href={paths.auth}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
