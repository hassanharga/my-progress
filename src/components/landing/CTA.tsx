import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { paths } from '@/paths';
import { Button } from '@/components/ui/button';

export default function CTA() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-bold to-information-bold px-6 py-16 text-center">
        <h2 className="text-heading-xxlarge font-weight-bold text-text-inverse sm:text-display-small">
          Start tracking your progress today
        </h2>
        <p className="mx-auto mt-4 max-w-md text-body-large text-text-inverse/80">
          Join others who are staying on top of their work, one task at a time.
        </p>
        <Button size="lg" className="mt-8 bg-surface text-text-brand hover:bg-surface-raised" asChild>
          <Link href={paths.auth}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
