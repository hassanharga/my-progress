import type { ReactNode } from 'react';
import Link from 'next/link';
import type { ProjectWorkspaceTask, ProjectWorkspaceViewModel } from '@/server/projects/project-workspace-types';
import { ArrowUpRight, CheckCircle2, CirclePause, CirclePlay, History } from 'lucide-react';

import { readableRichText } from '@/lib/rich-text-content';
import { Badge } from '@/components/ui/badge';

import { buildProjectWorkspaceHref } from './project-workspace-url';

const stateLabel: Record<ProjectWorkspaceTask['status'], string> = {
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  PAUSED: 'Paused',
  READY: 'Ready',
};

const stateVariant = (status: ProjectWorkspaceTask['status']) => {
  if (status === 'COMPLETED') return 'success' as const;
  if (status === 'CANCELLED') return 'danger' as const;
  if (status === 'PAUSED') return 'warning' as const;
  if (status === 'IN_PROGRESS') return 'information' as const;
  return 'outline' as const;
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m tracked`;
  const remainder = minutes % 60;
  return `${Math.floor(minutes / 60)}h${remainder ? ` ${remainder}m` : ''} tracked`;
};

function TaskRow({
  project,
  query,
  task,
}: {
  project: ProjectWorkspaceViewModel['project'];
  query: ProjectWorkspaceViewModel['query'];
  task: ProjectWorkspaceTask;
}) {
  return (
    <li className="project-ledger-task" data-state={task.status}>
      <div className="project-ledger-task__identity">
        <div className="project-ledger-task__title-line">
          <h3>{task.title}</h3>
          <Badge variant={stateVariant(task.status)}>{stateLabel[task.status]}</Badge>
        </div>
        <p>{task.currentNextStep ? `Next: ${readableRichText(task.currentNextStep)}` : 'No next step recorded.'}</p>
        <div className="project-ledger-task__meta">
          <span>{formatDuration(task.totalSeconds)}</span>
          {task.plannedMinutes !== null ? <span>{task.plannedMinutes}m planned</span> : null}
        </div>
      </div>
      <Link
        className="project-ledger-task__open"
        href={buildProjectWorkspaceHref(project.id, { current: query, update: { taskId: task.id } })}
        aria-label={`Open ${task.title}`}
      >
        Open task
        <ArrowUpRight aria-hidden="true" />
      </Link>
    </li>
  );
}

function LedgerRegion({
  empty,
  icon,
  project,
  query,
  tasks,
  title,
}: {
  empty: string;
  icon: ReactNode;
  project: ProjectWorkspaceViewModel['project'];
  query: ProjectWorkspaceViewModel['query'];
  tasks: ProjectWorkspaceTask[];
  title: string;
}) {
  const id = `project-region-${title.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <section className="project-ledger-region" aria-labelledby={id}>
      <div className="project-ledger-region__node" aria-hidden="true">
        {icon}
      </div>
      <div className="project-ledger-region__body">
        <div className="project-ledger-region__heading">
          <h2 id={id}>{title}</h2>
          <span>{tasks.length}</span>
        </div>
        {tasks.length ? (
          <ol className="project-ledger-region__tasks">
            {tasks.map((task) => (
              <TaskRow key={task.id} project={project} query={query} task={task} />
            ))}
          </ol>
        ) : (
          <p className="project-ledger-region__empty">{empty}</p>
        )}
      </div>
    </section>
  );
}

export function ProjectTaskSections({ workspace }: { workspace: ProjectWorkspaceViewModel }) {
  return (
    <div className="project-working-ledger" aria-label="Working ledger">
      <LedgerRegion
        empty="No task is running. Start with Today or choose one from the backlog."
        icon={<CirclePlay />}
        project={workspace.project}
        query={workspace.query}
        tasks={workspace.runningTask ? [workspace.runningTask] : []}
        title="Running now"
      />
      <LedgerRegion
        empty="Nothing is planned for Today. Choose a backlog task when you are ready."
        icon={<CheckCircle2 />}
        project={workspace.project}
        query={workspace.query}
        tasks={workspace.today}
        title="Today"
      />
      <LedgerRegion
        empty="No backlog tasks match these filters. Clear or adjust the filters."
        icon={<CirclePause />}
        project={workspace.project}
        query={workspace.query}
        tasks={workspace.backlog}
        title="Backlog"
      />
      <LedgerRegion
        empty="Completed and cancelled tasks will stay here as project history."
        icon={<History />}
        project={workspace.project}
        query={workspace.query}
        tasks={workspace.history}
        title="Completed and cancelled"
      />
    </div>
  );
}
