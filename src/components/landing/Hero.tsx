'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import AnimatedProductPreview from './AnimatedProductPreview';
import { paths } from '@/paths';

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-6 lg:px-8">
      {/* Gradient glow background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-bold/10 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        {/* Left: text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-text-brand">
            Your Productivity Companion
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Your tasks,
            <br />
            your time,
            <br />
            <span className="text-text-brand">your progress.</span>
          </h1>
          <p className="max-w-md text-lg text-text-subtle">
            Track tasks, log time, and see how far you&apos;ve come — all in one
            place. Built for anyone who wants to stay on top of their work.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href={paths.auth}>
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="default" asChild>
              <a href="#how-it-works">
                <Play className="mr-2 h-4 w-4" />
                See How It Works
              </a>
            </Button>
          </div>
        </motion.div>

        {/* Right: animated preview */}
        <AnimatedProductPreview />
      </div>
    </section>
  );
}
