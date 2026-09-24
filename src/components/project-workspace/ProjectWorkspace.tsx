import type { ProjectWorkspaceViewModel } from '@/server/projects/project-workspace-types';

import { TaskWorkspaceSheet } from '../task-workspace/TaskWorkspaceSheet';
import { ProjectHeader } from './ProjectHeader';
import { ProjectSummary } from './ProjectSummary';
import { ProjectTaskSections } from './ProjectTaskSections';
import { ProjectWorkspaceFilters } from './ProjectWorkspaceFilters';

export function ProjectWorkspace({ initialWorkspace }: { initialWorkspace: ProjectWorkspaceViewModel }) {
  return (
    <div className="project-workspace" aria-labelledby="project-workspace-heading">
      <ProjectHeader project={initialWorkspace.project} />
      <ProjectSummary summary={initialWorkspace.summary} />
      <ProjectWorkspaceFilters projectId={initialWorkspace.project.id} query={initialWorkspace.query} />
      <ProjectTaskSections workspace={initialWorkspace} />
      {initialWorkspace.selectedTask ? <TaskWorkspaceSheet initialWorkspace={initialWorkspace} /> : null}
    </div>
  );
}
