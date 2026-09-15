import type { DomainResult, TaskSnapshot, TaskTransitionSnapshot } from '@/server/tasks/task-transition-types';
import { formatTaskDuration } from '@/utils/calculate-elapsed-time';

import type { TaskListItem } from '@/types/task';

type ActionResponse<T> = {
  data?: T;
  serverError?: string;
  validationErrors?: unknown;
};

const mergeTaskSnapshot = (tasks: TaskListItem[], snapshot: TaskSnapshot): TaskListItem[] => {
  const item: TaskListItem = {
    createdAt: snapshot.createdAt,
    duration: formatTaskDuration(snapshot.totalSeconds, snapshot.openSessionStartedAt),
    id: snapshot.id,
    status: snapshot.status,
    title: snapshot.title,
    totalSeconds: snapshot.totalSeconds,
  };
  const index = tasks.findIndex(({ id }) => id === snapshot.id);
  if (index === -1) return [item, ...tasks];

  const next = [...tasks];
  next[index] = { ...next[index], ...item };
  return next;
};

const mergeTransitionSnapshot = (tasks: TaskListItem[], snapshot: TaskTransitionSnapshot): TaskListItem[] => {
  let next = mergeTaskSnapshot(tasks, snapshot.task);
  if (snapshot.replacedTask) next = mergeTaskSnapshot(next, snapshot.replacedTask);
  return next;
};

export const reconcileTaskMutation = ({
  latestVersion,
  response,
  responseVersion,
  tasks,
}: {
  latestVersion: number;
  response: ActionResponse<DomainResult<TaskTransitionSnapshot>>;
  responseVersion: number;
  tasks: TaskListItem[];
}): {
  confirmedSuccess: boolean;
  error?: string;
  preserveInput: boolean;
  stale: boolean;
  tasks: TaskListItem[];
} => {
  if (responseVersion !== latestVersion) {
    return { confirmedSuccess: false, preserveInput: true, stale: true, tasks };
  }

  if (response.serverError) {
    return {
      confirmedSuccess: false,
      error: response.serverError,
      preserveInput: true,
      stale: false,
      tasks,
    };
  }
  if (response.validationErrors) {
    return {
      confirmedSuccess: false,
      error: 'Check the task details and try again.',
      preserveInput: true,
      stale: false,
      tasks,
    };
  }
  if (!response.data) {
    return {
      confirmedSuccess: false,
      error: 'The task did not return a result.',
      preserveInput: true,
      stale: false,
      tasks,
    };
  }
  if (!response.data.ok) {
    return {
      confirmedSuccess: false,
      error: response.data.error.message,
      preserveInput: true,
      stale: false,
      tasks: response.data.canonical ? mergeTransitionSnapshot(tasks, response.data.canonical) : tasks,
    };
  }

  return {
    confirmedSuccess: true,
    preserveInput: false,
    stale: false,
    tasks: mergeTransitionSnapshot(tasks, response.data.data),
  };
};

type PaginationData = {
  hasNextPage: boolean;
  nextCursor: string | null;
  tasks: TaskListItem[];
};

type PaginationState = PaginationData & { isLoading: boolean };

export const reconcilePagination = ({
  current,
  latestVersion,
  response,
  responseVersion,
}: {
  current: PaginationState;
  latestVersion: number;
  response: ActionResponse<PaginationData>;
  responseVersion: number;
}): PaginationState & { error?: string; stale: boolean } => {
  if (responseVersion !== latestVersion) return { ...current, stale: true };
  if (response.serverError) {
    return { ...current, error: response.serverError, isLoading: false, stale: false };
  }
  if (!response.data) {
    return { ...current, error: 'The task page did not return a result.', isLoading: false, stale: false };
  }
  return { ...response.data, error: undefined, isLoading: false, stale: false };
};
