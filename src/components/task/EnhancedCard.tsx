'use client';

import type { FC, MouseEvent } from 'react';
import { STATUS_COLORS, type TaskStatus } from '@/constants/design-system';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, Check, Clock, Pause, Play } from 'lucide-react';

import type { LastTaskWithLoggedTime } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import Editor from '../shared/Editor';

export const ProgressAndTodo: FC<{ title: string; text: string | null }> = ({ title, text }) => {
  return (
    <div className="flex flex-col gap-1 p-1 flex-1 w-full">
      <h6 className="font-medium">{title}</h6>

      {text ? (
        <Editor defaultValue={text} disabled />
      ) : (
        <div className="border rounded-sm p-1 text-sm text-center">No Data</div>
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
  if (!task) return null;

  const displayStatus = task.status === 'RESUMED' ? 'IN_PROGRESS' : task.status;
  const statusColor = STATUS_COLORS[displayStatus as TaskStatus];
  const isActive = ['IN_PROGRESS', 'RESUMED'].includes(task.status);
  const isPaused = task.status === 'PAUSED';
  const isCompleted = task.status === 'COMPLETED';
  const isCancelled = task.status === 'CANCELLED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Card
        className="group relative overflow-hidden hover:shadow-lg transition-shadow duration-250 cursor-pointer"
        onClick={openTaskDetailsAction}
      >
        {/* Status indicator stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor.stripe}`} />

        <div className="p-6 space-y-4 pl-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            {/* title and project */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                {task.title}
              </h3>
              {task.currentProject && <p className="text-sm text-muted-foreground mt-1">{task.currentProject}</p>}
            </div>

            {/* TODO: add edit, duplicate, delete actions */}
            {/* {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEditAction && <DropdownMenuItem onClick={onEditAction}>Edit</DropdownMenuItem>}
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  {onDeleteAction && (
                    <DropdownMenuItem className="text-red-600" onClick={onDeleteAction}>
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )} */}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* status */}
            <Badge className={`${statusColor.bg} ${statusColor.text} border-0 p-2`}>
              {displayStatus.replace('_', ' ')}
            </Badge>

            {/* duration */}
            {task.duration && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{task.duration}</span>
              </div>
            )}

            {/* date */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(task.createdAt, 'MMM dd, yyyy')}</span>
            </div>
          </div>

          {/* Progress bar for active tasks */}
          {/* {isActive && (
            <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{
                  duration: 1.5,
                  ease: 'easeOut',
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
                className="absolute left-0 top-0 bottom-0 bg-primary opacity-50"
              />
            </div>
          )} */}

          {/* Quick actions */}
          {!isCompleted && (
            <div className="flex gap-2 opacity-1000 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              {(isPaused || isCancelled) && onPlayAction && (
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={isLoading}
                  onClick={onPlayAction}
                >
                  <Play className="w-3.5 h-3.5 mx-1" />
                  Resume
                </Button>
              )}
              {isActive && onPauseAction && (
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
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
                  className="cursor-pointer"
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
