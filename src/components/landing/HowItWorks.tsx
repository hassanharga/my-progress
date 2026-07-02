'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Create a task',
    description: 'Add what you\'re working on in seconds.',
  },
  {
    number: '02',
    title: 'Track your time',
    description: 'Start the timer with one click.',
  },
  {
    number: '03',
    title: 'Review your progress',
    description: 'See stats and insights at a glance.',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-surface-container/30 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-12 text-center font-display text-3xl font-bold sm:text-4xl">
          How it works
        </h2>

        <div className="flex flex-col items-stretch gap-8 md:flex-row md:justify-center">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-center gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex-1"
              >
                <div className="rounded-xl border bg-surface p-6 text-center md:w-64">
                  <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-bold font-display text-sm font-bold text-text-inverse">
                    {step.number}
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-subtle">
                    {step.description}
                  </p>
                </div>
              </motion.div>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden h-6 w-6 shrink-0 text-text-subtle md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
