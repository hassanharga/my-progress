'use client';

import type { FC, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Activity, CalendarDays, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

type StatCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  delay?: number;
};

export const StatCard: FC<StatCardProps> = ({ title, value, icon, description, trend, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    >
      <Card className="group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
        <CardContent className="flex flex-col items-start gap-2 p-3 sm:p-5 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-brand-bold/10 text-text-brand transition-colors group-hover:bg-brand-bold/20">
            {icon}
          </div>
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="text-xl sm:text-2xl font-bold tabular-nums text-text-brand"
            >
              {value}
            </motion.p>
            <p className="text-sm text-text-subtle">{title}</p>
            {description && <p className="text-xs text-text-subtle/70 mt-0.5">{description}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp
                  className={`w-3 h-3 ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'} ${!trend.isPositive && 'rotate-180'}`}
                />
                <span className={`text-xs ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>{trend.value}</span>
                <span className="text-xs text-text-subtle">vs last week</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

type StatsGridProps = {
  totalTime: string;
  completedTasks: number;
  activeTasks: number;
  thisWeekTime: string;
  thisMonthTime: string;
};

export const StatsGrid: FC<StatsGridProps> = ({ totalTime, completedTasks, activeTasks, thisWeekTime, thisMonthTime }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      <StatCard
        title="Active"
        value={activeTasks}
        icon={<Activity className="h-5 w-5" />}
        description="In progress"
        delay={0}
      />
      <StatCard
        title="Total Time"
        value={totalTime}
        icon={<Clock className="h-5 w-5" />}
        description="All time"
        delay={0.05}
      />
      <StatCard
        title="Completed"
        value={completedTasks}
        icon={<CheckCircle2 className="h-5 w-5" />}
        description="Total tasks"
        delay={0.1}
      />
      <StatCard
        title="This Week"
        value={thisWeekTime}
        icon={<Clock className="h-5 w-5" />}
        description="Time this week"
        delay={0.15}
      />
      <StatCard
        title="This Month"
        value={thisMonthTime}
        icon={<CalendarDays className="h-5 w-5" />}
        description="Time this month"
        delay={0.2}
      />
    </div>
  );
};
