import { buildProjectWorkspaceSearch, type ProjectWorkspaceQuery } from '@/schema/project-workspace';

export const buildProjectWorkspaceHref = (
  projectId: string,
  {
    current,
    update,
  }: {
    current: ProjectWorkspaceQuery;
    update: Partial<ProjectWorkspaceQuery>;
  }
): string => {
  const search = buildProjectWorkspaceSearch({ ...current, ...update });
  const query = search.toString();
  return `/projects/${encodeURIComponent(projectId)}${query ? `?${query}` : ''}`;
};
