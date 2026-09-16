import {
  createTodayClientState,
  interpretTodayActionResult,
  isTodayOperationPending,
  staleTodayActionOutcome,
  todayReducer,
  type TodayClientState,
  type TodayOperationKey,
} from '../../src/components/today/today-reducer';
import type { TodayViewModel } from '../../src/server/today/today-types';

const view = (overrides: Partial<TodayViewModel> = {}): TodayViewModel => ({
  backlog: [],
  carryover: [],
  focus: null,
  generatedAt: '2026-09-15T09:00:00.000Z',
  items: [
    {
      actualSeconds: 0,
      createdAt: '2026-09-15T08:00:00.000Z',
      currentNextStep: null,
      id: 'plan-1',
      openSessionStartedAt: null,
      outcome: 'OPEN',
      plannedMinutes: 30,
      position: 0,
      project: { id: 'project-1', name: 'Core' },
      status: 'READY',
      taskId: 'task-1',
      title: 'First task',
    },
    {
      actualSeconds: 0,
      createdAt: '2026-09-15T08:01:00.000Z',
      currentNextStep: null,
      id: 'plan-2',
      openSessionStartedAt: null,
      outcome: 'OPEN',
      plannedMinutes: null,
      position: 1,
      project: { id: 'project-2', name: 'Side project' },
      status: 'PAUSED',
      taskId: 'task-2',
      title: 'Second task',
    },
  ],
  planDate: '2026-09-15',
  projects: [
    { id: 'project-1', name: 'Core' },
    { id: 'project-2', name: 'Side project' },
  ],
  revision: 0,
  runningIndicators: [],
  summary: { actualSeconds: 0, cancelledCount: 0, completedCount: 0, openCount: 2, totalCount: 2 },
  timezone: 'Africa/Cairo',
  workload: {
    actualSeconds: 0,
    capacityMinutes: null,
    plannedMinutes: 30,
    remainingMinutes: null,
    state: 'unset',
    utilizationPercent: null,
  },
  ...overrides,
});

const key = (kind: string, itemId?: string): TodayOperationKey => (itemId ? { kind, itemId } : { kind });

const requested = (state: TodayClientState, operationKey: TodayOperationKey, sequence: number): TodayClientState =>
  todayReducer(state, { key: operationKey, sequence, type: 'REQUEST' });

describe('Today client reducer', () => {
  it('replaces the complete Today model after a confirmed snapshot', () => {
    const operationKey = key('TRANSITION', 'task-1');
    const initial = createTodayClientState(view());
    const pending = requested(initial, operationKey, 1);
    const canonical = view({
      generatedAt: '2026-09-15T09:01:00.000Z',
      items: [
        { ...view().items[0], status: 'IN_PROGRESS', openSessionStartedAt: '2026-09-15T09:01:00.000Z' },
      ],
      summary: { actualSeconds: 0, cancelledCount: 0, completedCount: 0, openCount: 1, totalCount: 1 },
    });

    const next = todayReducer(pending, { key: operationKey, sequence: 1, snapshot: canonical, type: 'SUCCESS' });

    expect(next.today).toEqual(canonical);
    expect(next.pending).toEqual([]);
    expect(next.error).toBeNull();
    expect(next.notice).toBe('Task started.');
  });

  it('ignores a stale settlement when a newer sequence is pending for the same operation', () => {
    const operationKey = key('TRANSITION', 'task-1');
    let state = requested(createTodayClientState(view()), operationKey, 1);
    state = requested(state, operationKey, 2);

    const stale = todayReducer(state, {
      key: operationKey,
      sequence: 1,
      snapshot: view({ generatedAt: '2026-09-15T09:00:30.000Z' }),
      type: 'SUCCESS',
    });

    expect(stale).toEqual(state);
    expect(isTodayOperationPending(stale, operationKey)).toBe(true);
  });

  it('rolls an optimistic reorder back to the exact original order on failure', () => {
    const operationKey = key('REORDER');
    const initial = createTodayClientState(view());
    const pending = requested(initial, operationKey, 1);
    const optimistic = todayReducer(pending, {
      key: operationKey,
      orderedItemIds: ['plan-2', 'plan-1'],
      sequence: 1,
      type: 'OPTIMISTIC_REORDER',
    });

    expect(optimistic.today.items.map(({ id }) => id)).toEqual(['plan-2', 'plan-1']);
    expect(optimistic.today.items.map(({ position }) => position)).toEqual([0, 1]);

    const failed = todayReducer(optimistic, {
      error: { code: 'UNKNOWN', message: 'Network unavailable', retryable: true },
      key: operationKey,
      sequence: 1,
      type: 'FAILURE',
    });

    expect(failed.today.items.map(({ id }) => id)).toEqual(['plan-1', 'plan-2']);
    expect(failed.today.items.map(({ position }) => position)).toEqual([0, 1]);
    expect(failed.error).toEqual({ code: 'UNKNOWN', message: 'Network unavailable', retryable: true });
    expect(failed.notice).toBe('Could not reorder the plan. Try again.');
  });

  it('keeps independent controls pending at the same time', () => {
    const transitionKey = key('TRANSITION', 'task-1');
    const reorderKey = key('REORDER');
    let state = requested(createTodayClientState(view()), transitionKey, 1);
    state = requested(state, reorderKey, 2);

    expect(isTodayOperationPending(state, transitionKey)).toBe(true);
    expect(isTodayOperationPending(state, reorderKey)).toBe(true);

    state = todayReducer(state, { key: transitionKey, sequence: 1, snapshot: view(), type: 'SUCCESS' });
    expect(isTodayOperationPending(state, transitionKey)).toBe(false);
    expect(isTodayOperationPending(state, reorderKey)).toBe(true);
  });

  it('keeps the newer canonical snapshot when independent responses settle in reverse order', () => {
    const firstKey = key('TRANSITION', 'task-1');
    const secondKey = key('TRANSITION', 'task-2');
    let state = createTodayClientState(view());
    state = requested(state, firstKey, 1);
    state = requested(state, secondKey, 2);
    const newer = view({ generatedAt: '2026-09-15T09:02:00.000Z', items: [{ ...view().items[1], status: 'IN_PROGRESS' }], revision: 2 });
    const older = view({ generatedAt: '2026-09-15T09:01:00.000Z', items: [{ ...view().items[0], status: 'IN_PROGRESS' }], revision: 1 });

    state = todayReducer(state, { key: secondKey, sequence: 2, snapshot: newer, type: 'SUCCESS' });
    const stale = todayReducer(state, { key: firstKey, sequence: 1, snapshot: older, type: 'SUCCESS' });

    expect(stale.today).toBe(newer);
    expect(stale.notice).toBe('Task started.');
    expect(stale.error).toBeNull();
    expect(stale.pending).toEqual([]);
    expect(stale.latestAppliedSequence).toBe(2);
  });

  it('applies the later server commit even when its request was invoked first', () => {
    const firstKey = key('ADD', 'task-1');
    const secondKey = key('ADD', 'task-2');
    let state = createTodayClientState(view());
    state = requested(state, firstKey, 1);
    state = requested(state, secondKey, 2);
    const firstCommit = view({ items: [view().items[1]], revision: 1 });
    const laterCommit = view({ items: view().items, revision: 2 });

    state = todayReducer(state, { key: secondKey, sequence: 2, snapshot: firstCommit, type: 'SUCCESS' });
    state = todayReducer(state, { key: firstKey, sequence: 1, snapshot: laterCommit, type: 'SUCCESS' });

    expect(state.today).toBe(laterCommit);
    expect(state.today.items.map(({ taskId }) => taskId)).toEqual(['task-1', 'task-2']);
    expect(state.pending).toEqual([]);
  });

  it('does not restore an old optimistic order after a newer canonical snapshot is applied', () => {
    const reorderKey = key('REORDER', 'task-1');
    const transitionKey = key('TRANSITION', 'task-2');
    let state = requested(createTodayClientState(view()), reorderKey, 1);
    state = todayReducer(state, {
      key: reorderKey,
      orderedItemIds: ['plan-2', 'plan-1'],
      sequence: 1,
      type: 'OPTIMISTIC_REORDER',
    });
    state = requested(state, transitionKey, 2);
    const canonical = view({ generatedAt: '2026-09-15T09:02:00.000Z', items: [view().items[0], view().items[1]].reverse() });
    state = todayReducer(state, { key: transitionKey, sequence: 2, snapshot: canonical, type: 'SUCCESS' });
    const failed = todayReducer(state, {
      error: { code: 'UNKNOWN', message: 'Reorder failed', retryable: true },
      key: reorderKey,
      sequence: 1,
      type: 'FAILURE',
    });

    expect(failed.today).toBe(canonical);
    expect(failed.pending).toEqual([]);
    expect(failed.notice).toBe('Task started.');
  });

  it.each([
    ['first then second', ['task-1', 'task-3'], ['plan-1', 'plan-3', 'plan-2']],
    ['second then first', ['task-3', 'task-1'], ['plan-2', 'plan-1', 'plan-3']],
  ] as const)('restores only the failed reorder when independent reorders fail %s', (_label, failureOrder, intermediateOrder) => {
    const third = {
      ...view().items[0],
      id: 'plan-3',
      position: 2,
      taskId: 'task-3',
      title: 'Third task',
    };
    const initial = view({ items: [...view().items, third] });
    const firstKey = key('REORDER', 'task-1');
    const secondKey = key('REORDER', 'task-3');
    let state = requested(createTodayClientState(initial), firstKey, 1);
    state = todayReducer(state, {
      key: firstKey,
      orderedItemIds: ['plan-2', 'plan-1', 'plan-3'],
      sequence: 1,
      type: 'OPTIMISTIC_REORDER',
    });
    state = requested(state, secondKey, 2);
    state = todayReducer(state, {
      key: secondKey,
      orderedItemIds: ['plan-2', 'plan-3', 'plan-1'],
      sequence: 2,
      type: 'OPTIMISTIC_REORDER',
    });

    failureOrder.forEach((taskId, index) => {
      state = todayReducer(state, {
        error: { code: 'UNKNOWN', message: 'Reorder failed', retryable: true },
        key: key('REORDER', taskId),
        sequence: taskId === 'task-1' ? 1 : 2,
        type: 'FAILURE',
      });

      if (index === 0) {
        expect(state.today.items.map(({ id }) => id)).toEqual(intermediateOrder);
        expect(state.pending).toHaveLength(1);
      }
    });

    expect(state.today.items.map(({ id }) => id)).toEqual(['plan-1', 'plan-2', 'plan-3']);
    expect(state.today.items.map(({ position }) => position)).toEqual([0, 1, 2]);
    expect(state.pending).toEqual([]);
  });

  it('uses a transition snapshot as the complete selected-date replacement', () => {
    const operationKey = key('TRANSITION', 'task-1');
    const canonical = view({
      focus: { ...view().items[1], planItemId: 'plan-2', source: 'planned' },
      items: [{ ...view().items[1], status: 'IN_PROGRESS' }],
      runningIndicators: [
        {
          elapsedSeconds: 10,
          project: { id: 'project-2', name: 'Side project' },
          sessionId: 'session-2',
          startedAt: '2026-09-15T09:00:00.000Z',
          taskId: 'task-2',
          title: 'Second task',
        },
      ],
    });

    const next = todayReducer(requested(createTodayClientState(view()), operationKey, 4), {
      key: operationKey,
      sequence: 4,
      snapshot: canonical,
      type: 'SUCCESS',
    });

    expect(next.today).toBe(canonical);
    expect(next.today.focus?.taskId).toBe('task-2');
    expect(next.today.runningIndicators).toHaveLength(1);
  });

  it.each([
    {
      canonical: true,
      retryable: true,
      notice: 'The plan changed elsewhere. The server state is shown; you can retry.',
    },
    {
      canonical: true,
      retryable: false,
      notice: 'The plan changed elsewhere. The server state is shown.',
    },
    {
      canonical: false,
      retryable: true,
      notice: 'The server state could not be confirmed. Try again.',
    },
    {
      canonical: false,
      retryable: false,
      notice: 'Another task started first',
    },
  ])('uses truthful conflict copy for canonical=$canonical retryable=$retryable', ({ canonical: hasCanonical, retryable, notice }) => {
    const operationKey = key('TRANSITION', 'task-1');
    const canonical = view({ items: [{ ...view().items[0], status: 'PAUSED' }] });
    const next = todayReducer(requested(createTodayClientState(view()), operationKey, 7), {
      error: { code: 'CONFLICT', message: 'Another task started first', retryable },
      key: operationKey,
      sequence: 7,
      ...(hasCanonical ? { canonical } : {}),
      type: 'CONFLICT',
    });

    expect(next.notice).toBe(notice);
    if (hasCanonical) expect(next.today).toBe(canonical);
    else expect(next.today).toEqual(view());
    expect(next.pending).toEqual([]);
    expect(next.error?.retryable).toBe(retryable);
  });

  it('preserves an unknown failure and never reports a false success', () => {
    const operationKey = key('CREATE');
    const next = todayReducer(requested(createTodayClientState(view()), operationKey, 8), {
      error: { code: 'UNKNOWN', message: 'The action could not be completed', retryable: true },
      key: operationKey,
      sequence: 8,
      type: 'FAILURE',
    });

    expect(next.today).toEqual(view());
    expect(next.pending).toEqual([]);
    expect(next.error?.message).toBe('The action could not be completed');
    expect(next.notice).toBe('The action could not be completed. Try again.');
  });

  it('does not advertise retry for a nonretryable failure', () => {
    const operationKey = key('TRANSITION', 'task-1');
    const next = todayReducer(requested(createTodayClientState(view()), operationKey, 9), {
      error: { code: 'VALIDATION_ERROR', message: 'The task is archived', retryable: false },
      key: operationKey,
      sequence: 9,
      type: 'FAILURE',
    });

    expect(next.notice).toBe('The task is archived');
  });
});

describe('Today action-result interpretation', () => {
  it('returns an explicit clear-input outcome only for a domain success', () => {
    const snapshot = view();
    expect(interpretTodayActionResult({ data: { data: snapshot, ok: true } })).toEqual({
      kind: 'SUCCESS',
      outcome: { ok: true, preserveInput: false },
      snapshot,
    });
  });

  it('returns an explicit preserve-input outcome for domain, transport, and validation failures', () => {
    expect(
      interpretTodayActionResult({
        data: { error: { code: 'CONFLICT', message: 'Changed elsewhere', retryable: true }, ok: false },
      })
    ).toMatchObject({ kind: 'CONFLICT', outcome: { ok: false, preserveInput: true } });
    expect(interpretTodayActionResult({ serverError: 'Network unavailable' })).toMatchObject({
      kind: 'FAILURE',
      outcome: { ok: false, preserveInput: true },
    });
    expect(interpretTodayActionResult({ validationErrors: { title: 'Required' } })).toMatchObject({
      kind: 'FAILURE',
      error: { code: 'VALIDATION_ERROR', message: 'Check the highlighted fields.', retryable: false },
      outcome: { ok: false, preserveInput: true },
    });
  });

  it('marks an ignored stale settlement as non-success for form callers', () => {
    expect(staleTodayActionOutcome()).toEqual({
      error: { code: 'STALE', message: 'A newer result was already applied.', retryable: true },
      ok: false,
      preserveInput: true,
      stale: true,
    });
  });
});
