import type { ProjectWorkspaceViewModel } from '@/server/projects/project-workspace-types';

const formatDuration = (seconds: number): string => {
  const roundedMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export function ProjectSummary({ summary }: { summary: ProjectWorkspaceViewModel['summary'] }) {
  return (
    <dl className="project-workspace-summary" aria-label="Project summary">
      <div>
        <dt>Open</dt>
        <dd>{summary.openCount}</dd>
      </div>
      <div>
        <dt>Completed</dt>
        <dd>{summary.completedCount}</dd>
      </div>
      <div>
        <dt>Cancelled</dt>
        <dd>{summary.cancelledCount}</dd>
      </div>
      <div>
        <dt>Tracked</dt>
        <dd>{formatDuration(summary.trackedSeconds)}</dd>
      </div>
    </dl>
  );
}
