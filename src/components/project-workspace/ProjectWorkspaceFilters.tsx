import Link from 'next/link';
import type { ProjectWorkspaceQuery, ProjectWorkspaceStateFilter } from '@/schema/project-workspace';

import { buildProjectWorkspaceHref } from './project-workspace-url';

const filters: Array<{ label: string; value: ProjectWorkspaceStateFilter | null }> = [
  { label: 'All tasks', value: null },
  { label: 'Open', value: 'OPEN' },
  { label: 'Ready', value: 'READY' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function ProjectWorkspaceFilters({ projectId, query }: { projectId: string; query: ProjectWorkspaceQuery }) {
  return (
    <div className="project-workspace-filters">
      <form action={`/projects/${projectId}`} method="get" role="search" className="project-workspace-search">
        <label htmlFor="project-task-search">Search tasks</label>
        <div>
          <input
            id="project-task-search"
            name="query"
            defaultValue={query.query}
            placeholder="Search task titles"
            type="search"
          />
          {query.state ? <input type="hidden" name="state" value={query.state} /> : null}
          {query.taskId ? <input type="hidden" name="task" value={query.taskId} /> : null}
          <button type="submit">Search</button>
        </div>
      </form>
      <nav aria-label="Filter tasks by state" className="project-workspace-state-filters">
        {filters.map((filter) => {
          const current = query.state === filter.value;
          return (
            <Link
              key={filter.label}
              href={buildProjectWorkspaceHref(projectId, {
                current: query,
                update: { state: filter.value, taskId: null },
              })}
              aria-current={current ? 'page' : undefined}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
