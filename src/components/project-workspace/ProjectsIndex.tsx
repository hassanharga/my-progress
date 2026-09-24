import Link from 'next/link';
import { Archive, ArrowUpRight, FolderOpen } from 'lucide-react';

import type { ProjectListItem } from '@/actions/project';
import ProjectManager from '@/components/shared/ProjectManager';

export function ProjectsIndex({ projects }: { projects: ProjectListItem[] }) {
  const active = projects.filter((project) => !project.archived);
  const archived = projects.filter((project) => project.archived);

  return (
    <div className="projects-index">
      <header>
        <p className="project-workspace-eyebrow">Project workspaces</p>
        <h1>Choose a project</h1>
        <p>Open active work, or manage the projects you want available next.</p>
      </header>
      <section aria-labelledby="active-projects-heading">
        <h2 id="active-projects-heading">Active projects</h2>
        {active.length ? (
          <ul className="projects-index__list">
            {active.map((project) => (
              <li key={project.id}>
                <FolderOpen aria-hidden="true" />
                <div>
                  <strong>{project.name}</strong>
                  <span>{project.taskCount} tasks</span>
                </div>
                <Link href={`/projects/${project.id}`} aria-label={`Open ${project.name}`}>
                  Open workspace <ArrowUpRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="projects-index__empty">
            No active project is ready yet. Create one below to start a workspace.
          </p>
        )}
      </section>
      {archived.length ? (
        <section aria-labelledby="archived-projects-heading">
          <h2 id="archived-projects-heading">Archived projects</h2>
          <ul className="projects-index__list projects-index__list--archived">
            {archived.map((project) => (
              <li key={project.id}>
                <Archive aria-hidden="true" />
                <div>
                  <strong>{project.name}</strong>
                  <span>{project.taskCount} tasks · Read-only</span>
                </div>
                <Link href={`/projects/${project.id}`} aria-label={`View archived project ${project.name}`}>
                  View history
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="manage-projects-heading" className="projects-index__manager">
        <h2 id="manage-projects-heading">Create or restore projects</h2>
        <p>Create a workspace or restore archived work when it becomes active again.</p>
        <ProjectManager />
      </section>
    </div>
  );
}
