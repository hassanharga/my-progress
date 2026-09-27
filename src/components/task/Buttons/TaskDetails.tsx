'use client';

import { useRef, useState, type FC } from 'react';
import { STATUS_TOKENS } from '@/constants/status';
import { format } from 'date-fns';
import { Calendar, Check, Clock, Pause, Pencil, Play } from 'lucide-react';
import { toast } from 'sonner';

import type { TaskWithLoggedTime } from '@/types/task';
import { useTaskContext } from '@/contexts/task.context';
import { FadeIn } from '@/components/shared/animations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const { editTask, updateTask, isExecutingEditTask, isTaskPending } = useTaskContext();

  const [isEditing, setIsEditing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState('');
  const [todo, setTodo] = useState('');
  const completeTriggerRef = useRef<HTMLButtonElement>(null);

  if (!task) return null;

  const statusColor = STATUS_TOKENS[task.status];
  const isActive = task.status === 'IN_PROGRESS';
  const isReady = task.status === 'READY';
  const isCompleted = task.status === 'COMPLETED';
  const isCancelled = task.status === 'CANCELLED';
  const isLoading = isExecutingEditTask || isTaskPending(task.id);

  const handleEdit = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setProgress(task.progress || '');
    setTodo(task.todo || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    const result = await editTask({
      id: task.id,
      title,
      description,
      progress: progress === (task.progress || '') ? undefined : progress,
      todo: todo === (task.todo || '') ? undefined : todo,
    });
    if (!result.ok) {
      toast.error(result.error ?? 'Task details were not saved');
      return;
    }
    setIsEditing(false);
    toast.success('Task updated!');
  };

  const handlePlayPause = async () => {
    const result = await updateTask({ event: isActive ? 'PAUSE' : 'START', taskId: task.id });
    if (result.ok) toast.success(isActive ? 'Task paused' : isReady ? 'Task started' : 'Task resumed');
    else toast.error(result.error ?? 'Task was not updated');
  };

  const handleComplete = async ({ progress: p, todo: t }: { progress: string; todo: string }) => {
    const result = await updateTask({ event: 'COMPLETE', nextStep: t, progressNote: p, taskId: task.id });
    if (!result.ok) {
      toast.error(result.error ?? 'Task was not completed');
      return;
    }
    setShowCompleteModal(false);
    setOpen(false);
    toast.success('Task completed! 🎉', {
      description: 'Great job! The task has been marked as complete.',
    });
  };

  const handleCompleteOpenChange = (nextOpen: boolean) => {
    setShowCompleteModal(nextOpen);
    if (!nextOpen) requestAnimationFrame(() => completeTriggerRef.current?.focus());
  };

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[60vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update the task title, description, progress, and next steps.</DialogDescription>
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <textarea
                className="min-h-24 w-full rounded-md border border-border-input bg-surface px-150 py-100 text-body text-text outline-none focus-visible:border-border-focused focus-visible:ring-[3px] focus-visible:ring-border-focused/50"
                id="edit-description"
                maxLength={20_000}
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={3}
                value={description}
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
        <DialogContent className="sm:max-w-[60vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="pr-10">{task.title}</DialogTitle>
            </div>
            <DialogDescription>Review this task, update its state, or edit its working notes.</DialogDescription>
            <div className="flex items-center gap-2">
              <Badge className={`${statusColor.badge} w-fit`}>{statusColor.label}</Badge>
              <Button
                variant="default"
                size="icon-sm"
                onClick={handleEdit}
                disabled={isLoading}
                className="cursor-pointer shrink-0"
                aria-label="Edit task"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          </DialogHeader>

          <Separator className="my-6" />

          <div className="mb-6 space-y-2">
            <h3 className="font-medium">Task description</h3>
            <p className="whitespace-pre-line text-text-subtle">{task.description || 'No description added yet.'}</p>
          </div>

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
                  {isTaskPending(task.id) ? (
                    <Spinner />
                  ) : isActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      {isReady ? 'Start' : 'Resume'}
                    </>
                  )}
                </Button>
              )}
              {!isCompleted && !isCancelled && (
                <Button
                  ref={completeTriggerRef}
                  onClick={() => {
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
          isLoading={isTaskPending(task.id)}
          taskProgress={task.progress}
          open={showCompleteModal}
          setOpen={handleCompleteOpenChange}
        />
      )}
    </>
  );
};
