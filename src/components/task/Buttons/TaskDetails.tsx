'use client';

import { useState, type FC } from 'react';
import { STATUS_COLORS, type TaskStatus } from '@/constants/design-system';
import { format } from 'date-fns';
import { Building2, Calendar, Clock, FolderOpen, Pencil } from 'lucide-react';
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

type Props = {
  task?: TaskWithLoggedTime | null;
  setOpen: (open: boolean) => void;
  open: boolean;
};

export const TaskDetails: FC<Props> = ({ task, open, setOpen }) => {
  const { editTask, isExecutingEditTask } = useTaskContext();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [currentProject, setCurrentProject] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [progress, setProgress] = useState('');
  const [todo, setTodo] = useState('');

  if (!task) return null;

  const displayStatus = task.status === 'RESUMED' ? 'IN_PROGRESS' : task.status;
  const statusColor = STATUS_COLORS[displayStatus as TaskStatus];

  const handleEdit = () => {
    setTitle(task.title);
    setCurrentProject(task.currentProject || '');
    setCurrentCompany(task.currentCompany || '');
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
      currentProject,
      currentCompany,
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

  if (isEditing) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[60vw] max-h-[80vh] overflow-y-auto" aria-describedby="Edit task">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <Badge className={`${statusColor.bg} ${statusColor.text} border-0 w-fit`}>
              {displayStatus.replace('_', ' ')}
            </Badge>
          </DialogHeader>

          <Separator className="my-6" />

          <FadeIn delay={0.1}>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-project" className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    Project
                  </Label>
                  <Input
                    id="edit-project"
                    value={currentProject}
                    onChange={(e) => setCurrentProject(e.target.value)}
                    placeholder="Project name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-company" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Company
                  </Label>
                  <Input
                    id="edit-company"
                    value={currentCompany}
                    onChange={(e) => setCurrentCompany(e.target.value)}
                    placeholder="Company name"
                  />
                </div>
              </div>
            </div>
          </FadeIn>

          <Separator className="my-6" />

          <FadeIn delay={0.2}>
            <div className="flex flex-col gap-6">
              <ProgressAndTodo
                title="Progress - Completed"
                text={progress || null}
                disabled={false}
                onChange={setProgress}
              />
              <ProgressAndTodo
                title="Todo - Next Steps"
                text={todo || null}
                disabled={false}
                onChange={setTodo}
              />
            </div>
          </FadeIn>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isExecutingEditTask}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isExecutingEditTask || !title.trim()}>
              {isExecutingEditTask ? <Spinner /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[60vw] max-h-[80vh] overflow-y-auto" aria-describedby="Task details">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{task.title}</DialogTitle>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          </div>
          <Badge className={`${statusColor.bg} ${statusColor.text} border-0 w-fit`}>
            {displayStatus.replace('_', ' ')}
          </Badge>
        </DialogHeader>

        <Separator className="my-6" />

        {/* Meta Information */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium">{format(task.createdAt, 'MMM dd, yyyy')}</p>
                <p className="text-xs text-muted-foreground">{format(task.createdAt, 'hh:mm aa')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Total Time</p>
                <p className="font-medium">{task.duration}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Project</p>
                <p className="font-medium">{task.currentProject || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Company</p>
                <p className="font-medium">{task.currentCompany || '-'}</p>
              </div>
            </div>
          </div>
        </FadeIn>

        <Separator className="my-6" />

        {/* Progress and Todo */}
        <FadeIn delay={0.2}>
          <div className="flex flex-col gap-6">
            <ProgressAndTodo
              key={`progress-${task.updatedAt}`}
              title="Progress - Completed"
              text={task.progress}
            />
            <ProgressAndTodo key={`todo-${task.updatedAt}`} title="Todo - Next Steps" text={task.todo} />
          </div>
        </FadeIn>
      </DialogContent>
    </Dialog>
  );
};
