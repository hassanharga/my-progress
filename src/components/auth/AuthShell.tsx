'use client';

import { type ReactNode } from 'react';
import { BarChart3, PenLine, Timer } from 'lucide-react';

type AuthShellProps = {
  children: ReactNode;
};

const features = [
  { icon: Timer, text: 'One-click time tracking' },
  { icon: BarChart3, text: 'Real-time progress insights' },
  { icon: PenLine, text: 'Rich notes for every task' },
];

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen w-full grid-cols-1 bg-surface lg:grid-cols-2">
      {/* Branding panel — hidden on mobile */}
      <aside
        aria-label="About My Progress"
        className="hidden min-w-0 flex-col justify-between bg-surface-raised p-12 lg:flex"
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-bold text-text-inverse text-heading-medium">
            M
          </div>
          <span className="text-heading-small font-weight-semibold">My Progress</span>
        </div>

        {/* Tagline */}
        <div className="max-w-sm">
          <p className="text-heading-large font-weight-medium leading-snug">
            &ldquo;Track tasks, log time, and see how far you&apos;ve come.&rdquo;
          </p>
        </div>

        {/* Feature bullets */}
        <div className="flex flex-col gap-3">
          {features.map((feature) => (
            <div key={feature.text} className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-surface-sunken">
                <feature.icon className="size-4" aria-hidden="true" />
              </div>
              <span className="text-body text-text-subtle">{feature.text}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex min-w-0 w-full flex-col items-center justify-center px-4 py-10 sm:px-8">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-bold text-heading-medium text-text-inverse">
            M
          </div>
          <span className="text-heading-small font-weight-semibold">My Progress</span>
        </div>
        {children}
      </div>
    </main>
  );
}
