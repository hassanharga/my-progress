'use client';

import { useState, type FC } from 'react';
import { STATUS_TOKENS } from '@/constants/status';
import { format } from 'date-fns';
import { Calendar, Check, Clock, Pause, Pencil, Play } from 'lucide-react';
import { toast } from 'sonner';

import type { TaskWithLoggedTime } from '@/types/task';
import { useTaskContext } from '@/contexts/task.context';
import { FadeIn } from '@/components/shared/animations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

import { ProgressAndTodo } from '../EnhancedCard';
import { CompleteTask } from './CompleteTask';

type Props = {
  task?: TaskWithLoggedTime | null;
  setOpen: (open: boolean) => void;
  open: boolean;
};

export const TaskDetails: FC<Props> = ({ task, open, setOpen }) => {
  const { editTask, updateTask, isExecutingEditTask, isExecutingUpdateTask } = useTaskContext();

  const [isEditing, setIsEditing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState('');
  const [todo, setTodo] = useState('');

  if (!task) return null;

  const displayStatus = task.status === 'RESUMED' ? 'IN_PROGRESS' : task.status;
  const statusColor = STATUS_TOKENS[displayStatus as keyof typeof STATUS_TOKENS];
  const isActive = ['IN_PROGRESS', 'RESUMED'].includes(task.status);
  const isCompleted = task.status === 'COMPLETED';
  const isCancelled = task.status === 'CANCELLED';
  const isLoading = isExecutingEditTask || isExecutingUpdateTask;

  const handleEdit = () => {
    setTitle(task.title);
    setProgress(task.progress || '');
    setTodo(task.todo || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    const success = await editTask({
      id: task.id,
      title,
      progress,
      todo,
    });
    if (!success) {
      toast.error('Failed to update task');
      return;
    }
    setIsEditing(false);
    toast.success('Task updated!');
  };

  const handlePlayPause = () => {
    updateTask({ id: task.id, status: isActive ? 'PAUSED' : 'RESUMED' });
    toast.success(isActive ? 'Task paused' : 'Task resumed');
  };

  const handleComplete = ({ progress: p, todo: t }: { progress: string; todo: string }) => {
    updateTask({ id: task.id, status: 'COMPLETED', progress: p, todo: t });
    setShowCompleteModal(false);
    setOpen(false);
    toast.success('Task completed! 🎉', {
      description: 'Great job! The task has been marked as complete.',
    });
  };

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[60vw] max-h-[90vh] overflow-y-auto" aria-describedby="Edit task">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <Badge className={`${statusColor.badge} w-fit`}>{statusColor.label}</Badge>
          </DialogHeader>

          <div className="flex flex-col gap-4 ">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col gap-6 overflow-hidden">
            <ProgressAndTodo
              title="Progress - Completed"
              text={progress || null}
              disabled={false}
              onChange={setProgress}
            />
            <ProgressAndTodo title="Todo - Next Steps" text={todo || null} disabled={false} onChange={setTodo} />
          </div>

          <DialogFooter>
            <Button variant="default" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
              {isExecutingEditTask ? <Spinner /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[60vw] max-h-[80vh] overflow-y-auto" aria-describedby="Task details">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="pr-10">{task.title}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${statusColor.badge} w-fit`}>{statusColor.label}</Badge>
              <Button variant="default" size="icon-sm" onClick={handleEdit} disabled={isLoading} className="cursor-pointer shrink-0">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          </DialogHeader>

          <Separator className="my-6" />

          {/* Meta Information */}
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-text-subtle" />
                <div>
                  <p className="text-text-subtle">Started</p>
                  <p className="font-medium">{format(task.createdAt, 'MMM dd, yyyy')}</p>
                  <p className="text-xs text-text-subtle">{format(task.createdAt, 'hh:mm aa')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-text-subtle" />
                <div>
                  <p className="text-text-subtle">Total Time</p>
                  <p className="font-medium">{task.duration}</p>
                </div>
              </div>
            </div>
          </FadeIn>

          <Separator className="my-6" />

          {/* Progress and Todo */}
          <FadeIn delay={0.2}>
            <div className="flex flex-col gap-6">
              <ProgressAndTodo key={`progress-${task.updatedAt}`} title="Progress - Completed" text={task.progress} />
              <ProgressAndTodo key={`todo-${task.updatedAt}`} title="Todo - Next Steps" text={task.todo} />
            </div>
          </FadeIn>

          {/* Action buttons */}
          <DialogFooter>
            <div className="flex gap-2 w-full items-center">
              {!isCompleted && !isCancelled && (
                <Button variant="default" onClick={handlePlayPause} disabled={isLoading} className="cursor-pointer">
                  {isExecutingUpdateTask ? (
                    <Spinner />
                  ) : isActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Resume
                    </>
                  )}
                </Button>
              )}
              {!isCompleted && (
                <Button
                  onClick={() => {
                    (document.activeElement as HTMLElement)?.blur();
                    setShowCompleteModal(true);
                  }}
                  disabled={isLoading}
                  className="cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Complete
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete task modal */}
      {showCompleteModal && (
        <CompleteTask
          completeTask={handleComplete}
          isLoading={isExecutingUpdateTask}
          taskProgress={task.progress}
          open={showCompleteModal}
          setOpen={setShowCompleteModal}
        />
      )}
    </>
  );
};
