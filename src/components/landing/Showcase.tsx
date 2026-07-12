'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Play, Check, BarChart3, Calendar } from 'lucide-react';

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(target * progress);
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [isInView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count % 1 === 0 ? count : count.toFixed(1)}
      {suffix}
    </span>
  );
}

export default function Showcase() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-heading-xxlarge font-weight-bold sm:text-display-small">
          Your progress, visualized
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-2xl border bg-surface shadow-2xl"
        >
          {/* Mock dashboard header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <p className="text-body text-text-subtle">
                Good afternoon 👋
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-brand-bold/20" />
          </div>

          {/* Mock stats grid */}
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">
            {[
              { icon: Play, label: 'Total Time', target: 142, suffix: 'h' },
              { icon: Check, label: 'Completed', target: 87, suffix: '' },
              { icon: BarChart3, label: 'Active', target: 12, suffix: '' },
              { icon: Calendar, label: 'This Week', target: 28, suffix: 'h' },
              { icon: Calendar, label: 'This Month', target: 112, suffix: 'h' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface p-4">
                <stat.icon className="mb-2 h-5 w-5 text-text-brand" />
                <p className="text-heading-large font-weight-bold text-text-brand">
                  <CountUp target={stat.target} suffix={stat.suffix} />
                </p>
                <p className="text-body-small text-text-subtle">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Mock task card */}
          <div className="border-t p-6">
            <div className="flex items-center justify-between rounded-lg border bg-surface p-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-brand-bold" />
                <span className="font-weight-medium">Build landing page</span>
                <span className="rounded-md border border-border-selected/20 bg-brand-bold/10 px-2 py-0.5 text-body-small text-text-brand">
                  In Progress
                </span>
              </div>
              <span className="font-mono text-body tabular-nums text-text-subtle">
                02:15:30
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
