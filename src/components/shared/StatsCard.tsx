'use client';

import type { FC, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock, ListTodo, TrendingUp } from 'lucide-react';

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
        <CardContent className="flex flex-col items-start gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            {icon}
          </div>
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="text-2xl font-bold tabular-nums text-primary"
            >
              {value}
            </motion.p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {description && <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp
                  className={`w-3 h-3 ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'} ${!trend.isPositive && 'rotate-180'}`}
                />
                <span className={`text-xs ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>{trend.value}</span>
                <span className="text-xs text-muted-foreground">vs last week</span>
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total Time Tracked"
        value={totalTime}
        icon={<Clock className="h-5 w-5" />}
        description="All time"
        delay={0}
      />
      <StatCard
        title="Completed Tasks"
        value={completedTasks}
        icon={<CheckCircle2 className="h-5 w-5" />}
        description="Total completed"
        delay={0.1}
      />
      <StatCard
        title="Active Tasks"
        value={activeTasks}
        icon={<ListTodo className="h-5 w-5" />}
        description="In progress"
        delay={0.2}
      />
      <StatCard
        title="This Week"
        value={thisWeekTime}
        icon={<Clock className="h-5 w-5" />}
        description="Time this week"
        delay={0.3}
      />
      <StatCard
        title="This Month"
        value={thisMonthTime}
        icon={<CalendarDays className="h-5 w-5" />}
        description="Time this month"
        delay={0.4}
      />
    </div>
  );
};
