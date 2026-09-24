import type { TaskWorkspaceViewModel } from '@/server/projects/project-workspace-types';
import { CirclePause, CirclePlay } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const statusLabel: Record<TaskWorkspaceViewModel['task']['status'], string> = {
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  PAUSED: 'Paused',
  READY: 'Ready',
};

const statusVariant = (status: TaskWorkspaceViewModel['task']['status']) => {
  if (status === 'COMPLETED') return 'success' as const;
  if (status === 'CANCELLED') return 'danger' as const;
  if (status === 'PAUSED') return 'warning' as const;
  if (status === 'IN_PROGRESS') return 'information' as const;
  return 'outline' as const;
};

export function TaskWorkspaceHeader({
  archived,
  onTransition,
  pending,
  projectName,
  task,
}: {
  archived: boolean;
  onTransition: (event: 'PAUSE' | 'START') => void;
  pending: boolean;
  projectName: string;
  task: TaskWorkspaceViewModel['task'];
}) {
  const isRunning = task.status === 'IN_PROGRESS';
  const canStart = task.status === 'READY' || task.status === 'PAUSED';

  return (
    <div className="task-workspace-identity">
      <div className="task-workspace-identity__details">
        <div className="task-workspace-identity__meta">
          <span>{projectName}</span>
          <Badge variant={statusVariant(task.status)}>{statusLabel[task.status]}</Badge>
          {archived ? <Badge variant="outline">Archived project · Read-only</Badge> : null}
        </div>
        <h2>{task.title}</h2>
      </div>
      {!archived && (isRunning || canStart) ? (
        <Button
          disabled={pending}
          onClick={() => onTransition(isRunning ? 'PAUSE' : 'START')}
          type="button"
          variant={isRunning ? 'warning' : 'primary'}
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : isRunning ? (
            <CirclePause data-icon="inline-start" />
          ) : (
            <CirclePlay data-icon="inline-start" />
          )}
          {isRunning ? 'Pause timer' : task.status === 'PAUSED' ? 'Resume timer' : 'Start timer'}
        </Button>
      ) : null}
    </div>
  );
}
