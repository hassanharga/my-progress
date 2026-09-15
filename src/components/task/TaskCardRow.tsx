'use client';

import { useRef, type FC, type MouseEvent } from 'react';
import { STATUS_TOKENS } from '@/constants/status';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, Check, Clock, MoreHorizontal, Pause, Play } from 'lucide-react';

import type { TaskListItem } from '@/types/task';
import { getRevealMotion, useReducedMotion } from '@/hooks/use-reduced-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
  task: TaskListItem;
  onPlay?: (e: MouseEvent<HTMLButtonElement>) => void;
  onPause?: (e: MouseEvent<HTMLButtonElement>) => void;
  onComplete?: (e: MouseEvent<HTMLButtonElement>) => void;
  onEdit?: () => void;
  onOpenDetails?: (opener: HTMLElement) => void;
  isLoading?: boolean;
  index?: number;
};

const TaskCardRow: FC<Props> = ({ task, onPlay, onPause, onComplete, onEdit, onOpenDetails, isLoading, index = 0 }) => {
  const tokens = STATUS_TOKENS[task.status];
  const isActive = task.status === 'IN_PROGRESS';
  const isCompleted = task.status === 'COMPLETED';
  const isCancelled = task.status === 'CANCELLED';
  const reducedMotion = useReducedMotion();
  const revealMotion = getRevealMotion(reducedMotion, index);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);

  const openDetails = () => {
    if (detailsTriggerRef.current) onOpenDetails?.(detailsTriggerRef.current);
  };

  return (
    <motion.div
      initial={revealMotion.initial}
      animate={{ opacity: 1, y: 0 }}
      transition={revealMotion.transition}
    >
      <div
        className={`group relative flex cursor-pointer items-center gap-150 rounded-lg border bg-surface p-150 pl-200 transition-colors hover:bg-surface-container ${
          isActive ? 'shadow-raised' : ''
        }`}
        onClick={openDetails}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${tokens.stripe}`} />

        <div className="flex flex-1 flex-col gap-050 min-w-0">
          <div className="flex items-center justify-between gap-100">
            <h3 className="min-w-0 truncate text-body font-weight-medium text-text">
              <button
                ref={detailsTriggerRef}
                type="button"
                className="max-w-full truncate rounded-xs text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focused focus-visible:ring-offset-2"
                onClick={(event) => {
                  event.stopPropagation();
                  openDetails();
                }}
              >
                {task.title}
              </button>
            </h3>
            <div className="flex shrink-0 items-center gap-075 text-body-small text-text-subtle">
              {task.duration && (
                <span className="flex items-center gap-025">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{task.duration}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-100">
            <div className="flex items-center gap-075">
              <Badge variant="outline" className={tokens.badge}>
                {tokens.label}
              </Badge>
              <span className="flex items-center gap-025 text-body-small text-text-subtlest">
                <Calendar className="h-3 w-3" />
                {format(task.createdAt, 'MMM dd')}
              </span>
            </div>

            {!isCompleted && !isCancelled && (
              <div className="flex items-center gap-025 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                {isActive && onPause && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPause(e);
                    }}
                    className="cursor-pointer"
                    title="Pause"
                    aria-label="Pause"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                )}
                {!isActive && onPlay && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(e);
                    }}
                    className="cursor-pointer"
                    title={task.status === 'READY' ? 'Start' : 'Resume'}
                    aria-label={task.status === 'READY' ? 'Start' : 'Resume'}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                {onComplete && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(e);
                    }}
                    className="cursor-pointer"
                    title="Complete"
                    aria-label="Complete"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="subtle"
                        size="icon-sm"
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer"
                        title="More actions"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit();
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TaskCardRow;
