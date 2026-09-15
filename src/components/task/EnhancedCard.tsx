'use client';

import type { FC, MouseEvent } from 'react';
import { STATUS_TOKENS } from '@/constants/status';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, Check, Clock, Pause, Play } from 'lucide-react';

import type { LastTaskWithLoggedTime } from '@/types/task';
import { getRevealMotion, useReducedMotion } from '@/hooks/use-reduced-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import Editor from '../shared/Editor';

export const ProgressAndTodo: FC<{
  title: string;
  text: string | null;
  disabled?: boolean;
  onChange?: (value: string) => void;
}> = ({ title, text, disabled = true, onChange }) => {
  return (
    <div className="flex flex-col gap-1 p-1 flex-1 w-full min-w-0">
      <h6 className="text-body-small font-weight-bold text-text-subtlest">{title}</h6>
      {text || !disabled ? (
        <Editor defaultValue={text ?? undefined} disabled={disabled} onChange={onChange} />
      ) : (
        <div className="border rounded-sm p-1 text-body-small text-text-subtle text-center">No data</div>
      )}
    </div>
  );
};

type Props = {
  task: LastTaskWithLoggedTime;
  isLoading?: boolean;
  onPlayAction?: (e: MouseEvent<HTMLButtonElement>) => void;
  onPauseAction?: (e: MouseEvent<HTMLButtonElement>) => void;
  onCompleteAction?: (e: MouseEvent<HTMLButtonElement>) => void;
  openTaskDetailsAction?: () => void;
};

export const EnhancedTaskCard: FC<Props> = ({
  task,
  isLoading,
  onPlayAction,
  onPauseAction,
  onCompleteAction,
  openTaskDetailsAction,
}) => {
  const reducedMotion = useReducedMotion();

  if (!task) return null;

  const statusColor = STATUS_TOKENS[task.status];
  const isActive = task.status === 'IN_PROGRESS';
  const isReady = task.status === 'READY';
  const isPaused = task.status === 'PAUSED';
  const isCompleted = task.status === 'COMPLETED';
  const isCancelled = task.status === 'CANCELLED';
  const revealMotion = getRevealMotion(reducedMotion);

  return (
    <motion.div
      initial={revealMotion.initial}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      transition={revealMotion.transition}
    >
      <Card
        className="group relative overflow-hidden rounded-lg hover:shadow-raised transition-all duration-150 cursor-pointer"
        onClick={openTaskDetailsAction}
      >
        {/* Status indicator stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor.stripe}`} />

        <div className="p-6 space-y-4 pl-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            {/* title and project */}
            <div className="flex-1 min-w-0">
              <h3 className="text-heading-small font-weight-bold truncate group-hover:text-text-brand transition-colors">
                {task.title}
              </h3>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* status */}
            <Badge variant="outline" className={`${statusColor.badge}`}>
              {statusColor.label}
            </Badge>

            {/* duration */}
            {task.duration && (
              <div className="flex items-center gap-1.5 text-text-subtle">
                <Clock className="w-3.5 h-3.5" />
                <span className="tabular-nums font-medium text-text-brand">{task.duration}</span>
              </div>
            )}

            {/* date */}
            <div className="flex items-center gap-1.5 text-text-subtle">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(task.createdAt, 'MMM dd, yyyy')}</span>
            </div>
          </div>

          {/* Quick actions */}
          {!isCompleted && !isCancelled && (
            <div className="flex gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              {(isReady || isPaused) && onPlayAction && (
                <Button
                  size="sm"
                  variant="default"
                  className={`${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={isLoading}
                  onClick={onPlayAction}
                >
                  <Play className="w-3.5 h-3.5 mx-1" />
                  {isReady ? 'Start' : 'Resume'}
                </Button>
              )}
              {isActive && onPauseAction && (
                <Button
                  size="sm"
                  variant="default"
                  className={`${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={isLoading}
                  onClick={onPauseAction}
                >
                  <Pause className="w-3.5 h-3.5 mx-1" />
                  Pause
                </Button>
              )}
              {onCompleteAction && (
                <Button
                  size="sm"
                  variant="default"
                  className={`${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={isLoading}
                  onClick={onCompleteAction}
                >
                  <Check className="w-3.5 h-3.5 mx-1" />
                  Complete
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
