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
    <div className="flex min-h-screen w-full">
      {/* Branding panel — hidden on mobile */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary to-accent p-12 lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 font-display text-lg font-bold text-white">
            M
          </div>
          <span className="font-display text-xl font-semibold text-primary-foreground">My Progress</span>
        </div>

        {/* Tagline */}
        <div className="max-w-sm">
          <p className="font-display text-2xl font-medium leading-snug text-primary-foreground">
            &ldquo;Track tasks, log time, and see how far you&apos;ve come.&rdquo;
          </p>
        </div>

        {/* Feature bullets */}
        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature.text} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <feature.icon className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm text-primary-foreground/90">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
            M
          </div>
          <span className="font-display text-xl font-semibold">My Progress</span>
        </div>
        {children}
      </div>
    </div>
  );
}
