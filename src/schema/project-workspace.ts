import { z } from 'zod';

export type ProjectWorkspaceStateFilter =
  | 'OPEN'
  | 'READY'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProjectWorkspaceQuery = {
  query: string;
  state: ProjectWorkspaceStateFilter | null;
  taskId: string | null;
};

const stateFilter = z.enum(['OPEN', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']);

export const projectWorkspaceSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .max(200)
    .optional()
    .catch('')
    .transform((value) => value ?? ''),
  state: stateFilter
    .nullish()
    .catch(null)
    .transform((value) => value ?? null),
  task: z
    .uuid()
    .nullish()
    .catch(null)
    .transform((value) => value ?? null),
});

type ProjectWorkspaceSearch = URLSearchParams | Record<string, unknown>;

const searchValue = (search: ProjectWorkspaceSearch, key: string): unknown =>
  search instanceof URLSearchParams ? search.get(key) ?? undefined : search[key];

export const parseProjectWorkspaceQuery = (search: ProjectWorkspaceSearch): ProjectWorkspaceQuery => {
  const parsed = projectWorkspaceSearchSchema.parse({
    query: searchValue(search, 'query'),
    state: searchValue(search, 'state'),
    task: searchValue(search, 'task'),
  });

  return { query: parsed.query, state: parsed.state, taskId: parsed.task };
};

export const buildProjectWorkspaceSearch = (query: ProjectWorkspaceQuery): URLSearchParams => {
  const search = new URLSearchParams();
  if (query.query) search.set('query', query.query);
  if (query.state) search.set('state', query.state);
  if (query.taskId) search.set('task', query.taskId);
  return search;
};
