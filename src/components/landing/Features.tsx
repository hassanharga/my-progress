'use client';

import { motion } from 'framer-motion';
import { ClipboardList, Timer, BarChart3, PenLine } from 'lucide-react';

const features = [
  {
    icon: ClipboardList,
    title: 'Tasks',
    description: 'Create and manage your work with ease.',
  },
  {
    icon: Timer,
    title: 'Timer',
    description: 'One-click time logging per task.',
  },
  {
    icon: BarChart3,
    title: 'Stats',
    description: 'Weekly and monthly insights at a glance.',
  },
  {
    icon: PenLine,
    title: 'Notes',
    description: 'Rich text editor for progress tracking.',
  },
];

export default function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <span className="text-body-small font-weight-semibold uppercase tracking-widest text-text-brand">
            Everything You Need
          </span>
          <h2 className="mt-2 text-heading-xxlarge font-weight-bold sm:text-display-small">
            Track tasks, log time, and see your progress
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-xl border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-border-selected/30 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-bold/10 transition-colors group-hover:bg-brand-bold/20">
                <feature.icon className="h-6 w-6 text-text-brand" />
              </div>
              <h3 className="mb-2 text-body-xl font-weight-semibold">
                {feature.title}
              </h3>
              <p className="text-body text-text-subtle">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
