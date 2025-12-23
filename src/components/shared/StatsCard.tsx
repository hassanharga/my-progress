'use client';

import type { FC, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ListTodo, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <Card className="hover:shadow-md transition-shadow duration-250">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="text-2xl font-bold"
          >
            {value}
          </motion.div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp
                className={`w-3 h-3 ${trend.isPositive ? 'text-green-600' : 'text-red-600'} ${!trend.isPositive && 'rotate-180'}`}
              />
              <span className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>{trend.value}</span>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          )}
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
};

export const StatsGrid: FC<StatsGridProps> = ({ totalTime, completedTasks, activeTasks, thisWeekTime }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Time Tracked"
        value={totalTime}
        icon={<Clock className="h-4 w-4" />}
        description="All time"
        delay={0}
      />
      <StatCard
        title="Completed Tasks"
        value={completedTasks}
        icon={<CheckCircle2 className="h-4 w-4" />}
        description="Total completed"
        delay={0.1}
      />
      <StatCard
        title="Active Tasks"
        value={activeTasks}
        icon={<ListTodo className="h-4 w-4" />}
        description="In progress"
        delay={0.2}
      />
      <StatCard
        title="This Week"
        value={thisWeekTime}
        icon={<Clock className="h-4 w-4" />}
        description="Time this week"
        delay={0.3}
      />
      {/* trend={{ value: '+12%', isPositive: true }} */}
    </div>
  );
};
