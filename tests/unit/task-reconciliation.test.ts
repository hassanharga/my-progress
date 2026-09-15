import { reconcilePagination, reconcileTaskMutation } from '../../src/contexts/task-reconciliation';
import type { TaskTransitionSnapshot } from '../../src/server/tasks/task-transition-types';
import type { TaskListItem } from '../../src/types/task';

const CREATED_AT = new Date('2026-09-13T08:00:00.000Z');

const task = (overrides: Partial<TaskListItem> = {}): TaskListItem => ({
  createdAt: CREATED_AT,
  duration: '0m',
  id: 'task-1',
  status: 'READY',
  title: 'First task',
  totalSeconds: 0,
  ...overrides,
});

const snapshot = (overrides: Partial<TaskTransitionSnapshot['task']> = {}): TaskTransitionSnapshot => ({
  project: {
    id: 'project-1',
    openWorkCount: 1,
    pausedCount: 0,
    runningCount: 1,
    runningTaskId: 'task-1',
    trackedSeconds: 0,
  },
  replacedTask: null,
  session: null,
  task: {
    createdAt: CREATED_AT,
    currentNextStep: null,
    id: 'task-1',
    openSessionStartedAt: null,
    projectId: 'project-1',
    status: 'IN_PROGRESS',
    title: 'First task',
    totalSeconds: 0,
    ...overrides,
  },
  today: null,
});

describe('canonical task mutation reconciliation', () => {
  it('prepends a canonically created task', () => {
    const result = reconcileTaskMutation({
      latestVersion: 1,
      response: { data: { data: snapshot({ id: 'task-2', title: 'Created task' }), ok: true } },
      responseVersion: 1,
      tasks: [task()],
    });

    expect(result.confirmedSuccess).toBe(true);
    expect(result.preserveInput).toBe(false);
    expect(result.tasks.map(({ id }) => id)).toEqual(['task-2', 'task-1']);
    expect(result.tasks[0]).toMatchObject({ status: 'IN_PROGRESS', title: 'Created task' });
  });

  it.each([
    { label: 'start or resume', status: 'IN_PROGRESS' as const },
    { label: 'pause', status: 'PAUSED' as const },
    { label: 'complete', status: 'COMPLETED' as const },
  ])('merges a confirmed $label response', ({ status }) => {
    const result = reconcileTaskMutation({
      latestVersion: 2,
      response: { data: { data: snapshot({ status, totalSeconds: 3600 }), ok: true } },
      responseVersion: 2,
      tasks: [task()],
    });

    expect(result).toMatchObject({ confirmedSuccess: true, preserveInput: false, stale: false });
    expect(result.tasks[0]).toMatchObject({ duration: '1h 0m', status, totalSeconds: 3600 });
  });

  it('preserves tasks and typed input after a server failure', () => {
    const tasks = [task()];
    const result = reconcileTaskMutation({
      latestVersion: 3,
      response: { serverError: 'Database unavailable' },
      responseVersion: 3,
      tasks,
    });

    expect(result).toEqual({
      confirmedSuccess: false,
      error: 'Database unavailable',
      preserveInput: true,
      stale: false,
      tasks,
    });
  });

  it('merges canonical conflict state without reporting success', () => {
    const result = reconcileTaskMutation({
      latestVersion: 4,
      response: {
        data: {
          canonical: snapshot({ status: 'PAUSED' }),
          error: { code: 'CONFLICT', message: 'Another task started first', retryable: true },
          ok: false,
        },
      },
      responseVersion: 4,
      tasks: [task({ status: 'IN_PROGRESS' })],
    });

    expect(result).toMatchObject({
      confirmedSuccess: false,
      error: 'Another task started first',
      preserveInput: true,
      stale: false,
      tasks: [{ status: 'PAUSED' }],
    });
  });

  it('ignores a stale response without clearing the newer pending operation', () => {
    const tasks = [task()];
    expect(
      reconcileTaskMutation({
        latestVersion: 6,
        response: { data: { data: snapshot({ status: 'COMPLETED' }), ok: true } },
        responseVersion: 5,
        tasks,
      })
    ).toEqual({
      confirmedSuccess: false,
      preserveInput: true,
      stale: true,
      tasks,
    });
  });
});

describe('pagination settlement', () => {
  const current = {
    hasNextPage: true,
    isLoading: true,
    nextCursor: 'task-2',
    tasks: [task()],
  };

  it('settles the latest successful page and clears loading', () => {
    const nextTask = task({ id: 'task-2', title: 'Second task' });
    expect(
      reconcilePagination({
        current,
        latestVersion: 2,
        response: { data: { hasNextPage: false, nextCursor: null, tasks: [nextTask] } },
        responseVersion: 2,
      })
    ).toEqual({
      error: undefined,
      hasNextPage: false,
      isLoading: false,
      nextCursor: null,
      stale: false,
      tasks: [nextTask],
    });
  });

  it('preserves the page on failure and ignores stale settlement', () => {
    expect(
      reconcilePagination({
        current,
        latestVersion: 3,
        response: { serverError: 'Page failed' },
        responseVersion: 3,
      })
    ).toMatchObject({ ...current, error: 'Page failed', isLoading: false, stale: false });
    expect(
      reconcilePagination({
        current,
        latestVersion: 4,
        response: { data: { hasNextPage: false, nextCursor: null, tasks: [] } },
        responseVersion: 3,
      })
    ).toEqual({ ...current, stale: true });
  });
});
