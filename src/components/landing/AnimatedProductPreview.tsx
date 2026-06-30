'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Play, Check, BarChart3, Calendar } from 'lucide-react';

export default function AnimatedProductPreview() {
  const [seconds, setSeconds] = useState(5025); // 1h 23m 45s in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const timer = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="relative">
      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/20 blur-3xl" />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-xl border bg-card shadow-xl"
      >
        {/* Status stripe */}
        <div className="absolute left-0 top-0 h-full w-1 bg-primary" />

        {/* Card header */}
        <div className="flex items-center justify-between p-5 pl-7">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Play className="h-4 w-4 fill-primary text-primary" />
            </div>
            <div>
              <p className="font-medium">Design Homepage</p>
              <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                In Progress
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums text-primary">
              {timer}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-4 pl-7">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>68%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '68%' }}
              transition={{ duration: 2, delay: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-px border-t bg-border">
          <StatItem
            icon={<Play className="h-3.5 w-3.5" />}
            label="Total"
            target={4.5}
            suffix="h"
            delay={1.0}
          />
          <StatItem
            icon={<Check className="h-3.5 w-3.5" />}
            label="Done"
            target={3}
            delay={1.1}
          />
          <StatItem
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Active"
            target={12}
            delay={1.2}
          />
          <StatItem
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Week"
            target={28}
            suffix="h"
            delay={1.3}
          />
        </div>
      </motion.div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  target,
  suffix = '',
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  target: number;
  suffix?: string;
  delay?: number;
}) {
  const count = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 1.5,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v % 1 === 0 ? String(v) : v.toFixed(1)),
    });
    return () => controls.stop();
  }, [count, target, delay]);

  return (
    <div className="flex flex-col items-center gap-1 bg-card p-3">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-lg font-bold tabular-nums text-primary">
        {display}
        {suffix}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
