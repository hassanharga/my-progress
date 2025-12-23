import type { FC } from 'react';
import { STATUS_COLORS, type TaskStatus } from '@/constants/design-system';
import { format } from 'date-fns';
import { Building2, Calendar, Clock, FolderOpen } from 'lucide-react';

import type { TaskWithLoggedTime } from '@/types/task';
import { FadeIn } from '@/components/shared/animations';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import { ProgressAndTodo } from '../EnhancedCard';

type Props = {
  task?: TaskWithLoggedTime | null;
  setOpen: (open: boolean) => void;
  open: boolean;
};

export const TaskDetails: FC<Props> = ({ task, open, setOpen }) => {
  if (!task) return null;

  const displayStatus = task.status === 'RESUMED' ? 'IN_PROGRESS' : task.status;
  const statusColor = STATUS_COLORS[displayStatus as TaskStatus];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[60vw] max-h-[80vh] overflow-y-auto" aria-describedby="Create task">
        <DialogHeader>
          <DialogTitle>{task?.title}</DialogTitle>
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
                <p className="font-medium">{format(task?.createdAt, 'MMM dd, yyyy')}</p>
                <p className="text-xs text-muted-foreground">{format(task?.createdAt, 'hh:mm aa')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Total Time</p>
                <p className="font-medium">{task?.duration}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Project</p>
                <p className="font-medium">{task?.currentProject || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Company</p>
                <p className="font-medium">{task?.currentCompany || '-'}</p>
              </div>
            </div>
          </div>
        </FadeIn>

        <Separator className="my-6" />

        {/* Progress and Todo */}
        <FadeIn delay={0.2}>
          <div className="flex flex-col gap-6">
            <ProgressAndTodo title="Progress - Completed" text={task?.progress} />
            <ProgressAndTodo title="Todo - Next Steps" text={task?.todo} />
          </div>
        </FadeIn>
      </DialogContent>
    </Dialog>
  );
};
