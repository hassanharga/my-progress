'use client';

import type { FC, MouseEvent } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, Check, Clock, MoreHorizontal, Pause, Play } from 'lucide-react';

import type { TaskListItem } from '@/types/task';
import { STATUS_TOKENS } from '@/constants/status';
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
  onClick?: () => void;
  isLoading?: boolean;
  index?: number;
};

const TaskCardRow: FC<Props> = ({
  task,
  onPlay,
  onPause,
  onComplete,
  onEdit,
  onClick,
  isLoading,
  index = 0,
}) => {
  const displayStatus = task.status === 'RESUMED' ? 'IN_PROGRESS' : task.status;
  const tokens = STATUS_TOKENS[displayStatus as keyof typeof STATUS_TOKENS];
  const isActive = ['IN_PROGRESS', 'RESUMED'].includes(task.status);
  const isCompleted = task.status === 'COMPLETED';
  const isCancelled = task.status === 'CANCELLED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.15, ease: [0.4, 1, 0.6, 1] }}
    >
      <div
        className={`group relative flex cursor-pointer items-center gap-150 rounded-lg border bg-surface p-150 pl-200 transition-colors hover:bg-surface-container ${
          isActive ? 'shadow-raised' : ''
        }`}
        onClick={onClick}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${tokens.stripe}`} />

        <div className="flex flex-1 flex-col gap-050 min-w-0">
          <div className="flex items-center justify-between gap-100">
            <h3 className="truncate text-body font-weight-medium text-text">
              {task.title}
            </h3>
            <div className="flex shrink-0 items-center gap-075 text-body-small text-text-subtle">
              {task.duration && (
                <span className="flex items-center gap-025">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{task.duration}</span>
                </span>
              )}
              {task.currentProject && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-32">{task.currentProject}</span>
                </>
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
              <div className="flex items-center gap-025 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                {isActive && onPause && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => { e.stopPropagation(); onPause(e); }}
                    className="cursor-pointer"
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!isActive && onPlay && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => { e.stopPropagation(); onPlay(e); }}
                    className="cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onComplete && (
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    disabled={isLoading}
                    onClick={(e) => { e.stopPropagation(); onComplete(e); }}
                    className="cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
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
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
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
