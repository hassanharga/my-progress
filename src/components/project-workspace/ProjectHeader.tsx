import Link from 'next/link';
import type { ProjectWorkspaceViewModel } from '@/server/projects/project-workspace-types';
import { Archive, ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export function ProjectHeader({ project }: { project: ProjectWorkspaceViewModel['project'] }) {
  return (
    <header className="project-workspace-header">
      <div className="project-workspace-header__nav">
        <Link href="/projects" className="project-workspace-back-link">
          <ArrowLeft aria-hidden="true" />
          All projects
        </Link>
        {project.archived ? (
          <Badge variant="outline" className="project-workspace-archive-badge">
            <Archive aria-hidden="true" />
            Archived project · Read-only
          </Badge>
        ) : (
          <Badge variant="primary">Active project</Badge>
        )}
      </div>
      <div>
        <p className="project-workspace-eyebrow">Working ledger</p>
        <h1 id="project-workspace-heading">{project.name}</h1>
        <p className="project-workspace-header__description">
          Current work, next steps, and the history that got this project here.
        </p>
      </div>
      {project.archived ? (
        <div className="project-workspace-read-only" role="status">
          <strong>Read-only workspace.</strong> Editing is disabled until this project is restored.
        </div>
      ) : null}
    </header>
  );
}
