import type { ProjectWorkspaceViewModel } from '@/server/projects/project-workspace-types';

import {
  createProjectWorkspaceClientState,
  settleTaskWorkspaceRequest,
  taskWorkspaceReducer,
} from '@/components/task-workspace/task-workspace-reducer';

const canonical = (name: string): ProjectWorkspaceViewModel => ({
  backlog: [],
  history: [],
  project: { archived: false, archivedAt: null, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name },
  query: { query: '', state: null, taskId: '11111111-1111-4111-8111-111111111111' },
  runningTask: null,
  selectedTask: null,
  summary: { cancelledCount: 0, completedCount: 0, openCount: 0, runningTaskId: null, trackedSeconds: 0 },
  today: [],
});

describe('task workspace reducer', () => {
  it('keeps each request identity when same-key responses resolve out of order', async () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    let resolveFirst!: (value: ProjectWorkspaceViewModel) => void;
    let resolveSecond!: (value: ProjectWorkspaceViewModel) => void;
    const first = new Promise<ProjectWorkspaceViewModel>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<ProjectWorkspaceViewModel>((resolve) => {
      resolveSecond = resolve;
    });
    const dispatch = (action: Parameters<typeof taskWorkspaceReducer>[1]) => {
      state = taskWorkspaceReducer(state, action);
    };

    dispatch({ key: 'progress', requestId: 1, type: 'REQUEST' });
    const firstRun = settleTaskWorkspaceRequest({
      dispatch,
      execute: () => first,
      key: 'progress',
      onError: () => ({ message: 'First failed.', type: 'FAILURE' }),
      onResult: (workspace) => ({ clear: 'progress', message: 'First saved.', type: 'SUCCESS', workspace }),
      requestId: 1,
    });
    dispatch({ key: 'progress', requestId: 2, type: 'REQUEST' });
    const secondRun = settleTaskWorkspaceRequest({
      dispatch,
      execute: () => second,
      key: 'progress',
      onError: () => ({ message: 'Second failed.', type: 'FAILURE' }),
      onResult: (workspace) => ({ clear: 'progress', message: 'Second saved.', type: 'SUCCESS', workspace }),
      requestId: 2,
    });

    resolveSecond(canonical('Newest'));
    await secondRun;
    resolveFirst(canonical('Stale'));
    await firstRun;

    expect(state.canonical.project.name).toBe('Newest');
    expect(state.notice?.message).toBe('Second saved.');
  });

  it('ignores an older settlement for the same action key', () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 2, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, {
      clear: 'progress',
      key: 'progress',
      message: 'Old success',
      requestId: 1,
      type: 'SUCCESS',
      workspace: canonical('Stale'),
    });

    expect(state.canonical.project.name).toBe('Original');
    expect(state.pending.progress).toBe(2);
  });

  it('allows different action keys to settle independently', () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, { key: 'next-step', requestId: 2, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, {
      clear: 'nextStep',
      key: 'next-step',
      message: 'Next step saved.',
      requestId: 2,
      type: 'SUCCESS',
      workspace: canonical('Latest'),
    });

    expect(state.pending).toEqual({ progress: 1 });
    expect(state.canonical.project.name).toBe('Original');
    expect(state.requiresRefresh).toBe(true);
  });

  it.each([
    ['progress', 'next-step'],
    ['next-step', 'progress'],
  ])('waits for a fresh server read after %s then %s settles', (firstKey, secondKey) => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, { key: 'next-step', requestId: 2, type: 'REQUEST' });
    for (const [key, requestId] of [
      [firstKey, firstKey === 'progress' ? 1 : 2],
      [secondKey, secondKey === 'progress' ? 1 : 2],
    ] as const) {
      state = taskWorkspaceReducer(state, {
        key,
        message: `${key} saved`,
        requestId,
        type: 'SUCCESS',
        workspace: canonical(`Snapshot ${key}`),
      });
    }
    expect(state.pending).toEqual({});
    expect(state.canonical.project.name).toBe('Original');
    expect(state.requiresRefresh).toBe(true);
    state = taskWorkspaceReducer(state, { type: 'REFRESH_REQUESTED' });
    state = taskWorkspaceReducer(state, { type: 'RESET_CANONICAL', workspace: canonical('Fresh combined') });
    expect(state.canonical.project.name).toBe('Fresh combined');
    expect(state.requiresRefresh).toBe(false);
  });

  it('defers a canonical conflict during another request until a fresh server read', () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, { key: 'next-step', requestId: 2, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, {
      canonical: canonical('Conflict snapshot'),
      key: 'progress',
      message: 'Conflict',
      requestId: 1,
      type: 'FAILURE',
    });
    expect(state.canonical.project.name).toBe('Original');
    expect(state.notice?.tone).toBe('error');
    state = taskWorkspaceReducer(state, {
      key: 'next-step',
      message: 'Saved',
      requestId: 2,
      type: 'SUCCESS',
      workspace: canonical('Next snapshot'),
    });
    expect(state.canonical.project.name).toBe('Original');
    expect(state.requiresRefresh).toBe(true);
    state = taskWorkspaceReducer(state, { type: 'REFRESH_REQUESTED' });
    state = taskWorkspaceReducer(state, { type: 'RESET_CANONICAL', workspace: canonical('Fresh truth') });
    expect(state.canonical.project.name).toBe('Fresh truth');
  });

  it('replaces canonical state on a domain conflict while retaining drafts', () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, { field: 'progress', type: 'EDIT_DRAFT', value: 'My update' });
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, {
      canonical: canonical('Server truth'),
      key: 'progress',
      message: 'The task changed. Review the latest workspace and try again.',
      requestId: 1,
      type: 'FAILURE',
    });

    expect(state.canonical.project.name).toBe('Server truth');
    expect(state.drafts.progress).toBe('My update');
    expect(state.pending.progress).toBeUndefined();
    expect(state.notice?.tone).toBe('error');
  });

  it('preserves progress drafts after an unknown failure', () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, { field: 'progress', type: 'EDIT_DRAFT', value: 'Still here' });
    state = taskWorkspaceReducer(state, { field: 'progressNextStep', type: 'EDIT_DRAFT', value: 'Then this' });
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, {
      key: 'progress',
      message: 'Progress could not be saved. Refresh and try again.',
      requestId: 1,
      type: 'FAILURE',
    });

    expect(state.drafts.progress).toBe('Still here');
    expect(state.drafts.progressNextStep).toBe('Then this');
    expect(state.fieldErrors.progress).toBe('Progress could not be saved. Refresh and try again.');
    expect(state.fieldErrors.nextStep).toBeNull();
  });

  it('keeps progress and next-step errors attached to their respective controls', () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, { field: 'nextStep', type: 'EDIT_DRAFT', value: 'Keep this' });
    state = taskWorkspaceReducer(state, { key: 'next-step', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, {
      key: 'next-step',
      message: 'Could not save next step.',
      requestId: 1,
      type: 'FAILURE',
    });
    expect(state.fieldErrors.nextStep).toBe('Could not save next step.');
    expect(state.drafts.nextStep).toBe('Keep this');
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 2, type: 'REQUEST' });
    expect(state.fieldErrors.nextStep).toBe('Could not save next step.');
    state = taskWorkspaceReducer(state, { key: 'next-step', requestId: 3, type: 'REQUEST' });
    expect(state.fieldErrors.nextStep).toBeNull();
  });

  it('preserves a session correction after failure', () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, {
      sessionId: 'session-1',
      type: 'EDIT_CORRECTION',
      value: { endedAt: '2026-09-21T11:00', reason: 'Wrong stop', startedAt: '2026-09-21T10:00' },
    });
    state = taskWorkspaceReducer(state, { key: 'correction:session-1', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, {
      key: 'correction:session-1',
      message: 'Correction failed.',
      requestId: 1,
      type: 'FAILURE',
    });

    expect(state.drafts.corrections['session-1']?.reason).toBe('Wrong stop');
  });

  it('clears only the successful draft', () => {
    let state = createProjectWorkspaceClientState(canonical('Original'));
    state = taskWorkspaceReducer(state, { field: 'progress', type: 'EDIT_DRAFT', value: 'Done today' });
    state = taskWorkspaceReducer(state, { field: 'nextStep', type: 'EDIT_DRAFT', value: 'Keep this edit' });
    state = taskWorkspaceReducer(state, { key: 'progress', requestId: 1, type: 'REQUEST' });
    state = taskWorkspaceReducer(state, {
      clear: 'progress',
      key: 'progress',
      message: 'Progress saved.',
      requestId: 1,
      type: 'SUCCESS',
      workspace: canonical('Updated'),
    });

    expect(state.drafts.progress).toBe('');
    expect(state.drafts.progressNextStep).toBe('');
    expect(state.drafts.nextStep).toBe('Keep this edit');
    expect(state.notice).toEqual({ message: 'Progress saved.', tone: 'success' });
  });
});
