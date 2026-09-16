import type { TodayViewModel } from '@/server/today/today-types';
import type { DomainResult } from '@/server/tasks/task-transition-types';

export type TodayOperationKey = {
  kind: string;
  itemId?: string;
};

export type TodayClientError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type TodayPendingOperation = TodayOperationKey & {
  reorderDirection?: 'UP' | 'DOWN';
  reorderItemId?: string;
  rollbackOrder?: string[];
  sequence: number;
};

export type TodayClientState = {
  error: TodayClientError | null;
  latestAppliedSequence: number;
  notice: string | null;
  pending: TodayPendingOperation[];
  today: TodayViewModel;
};

export type TodayActionEnvelope = {
  data?: DomainResult<TodayViewModel>;
  serverError?: string;
  validationErrors?: unknown;
};

export type TodayActionOutcome =
  | { ok: true; preserveInput: false }
  | { error: TodayClientError; ok: false; preserveInput: true; stale?: boolean };

export type TodayActionInterpretation =
  | { kind: 'SUCCESS'; outcome: Extract<TodayActionOutcome, { ok: true }>; snapshot: TodayViewModel }
  | { canonical?: TodayViewModel; error: TodayClientError; kind: 'CONFLICT'; outcome: Extract<TodayActionOutcome, { ok: false }> }
  | { error: TodayClientError; kind: 'FAILURE'; outcome: Extract<TodayActionOutcome, { ok: false }> };

export type TodayReducerEvent =
  | { key: TodayOperationKey; sequence: number; type: 'REQUEST' }
  | { key: TodayOperationKey; orderedItemIds: string[]; sequence: number; type: 'OPTIMISTIC_REORDER' }
  | { key: TodayOperationKey; notice?: string; sequence: number; snapshot: TodayViewModel; type: 'SUCCESS' }
  | { canonical?: TodayViewModel; error: TodayClientError; key: TodayOperationKey; sequence: number; type: 'CONFLICT' }
  | { error: TodayClientError; key: TodayOperationKey; sequence: number; type: 'FAILURE' }
  | { key?: TodayOperationKey; type: 'RESET' };

const sameKey = (left: TodayOperationKey, right: TodayOperationKey): boolean =>
  left.kind === right.kind && left.itemId === right.itemId;

const findPending = (pending: TodayPendingOperation[], key: TodayOperationKey): TodayPendingOperation | undefined =>
  pending.find((operation) => sameKey(operation, key));

const removePending = (pending: TodayPendingOperation[], key: TodayOperationKey): TodayPendingOperation[] =>
  pending.filter((operation) => !sameKey(operation, key));

const isCurrentSettlement = (
  pending: TodayPendingOperation[],
  key: TodayOperationKey,
  sequence: number
): TodayPendingOperation | undefined => {
  const operation = findPending(pending, key);
  return operation?.sequence === sequence ? operation : undefined;
};

const withOrder = (today: TodayViewModel, orderedItemIds: string[]): TodayViewModel => {
  const itemsById = new Map(today.items.map((item) => [item.id, item]));
  const ordered = orderedItemIds.flatMap((id) => {
    const item = itemsById.get(id);
    if (!item) return [];
    itemsById.delete(id);
    return [item];
  });
  const remaining = [...itemsById.values()];
  const items = [...ordered, ...remaining].map((item, position) => ({ ...item, position }));
  return { ...today, items };
};

const currentOrder = (today: TodayViewModel): string[] => today.items.map(({ id }) => id);

const authoritativeRollbackOrder = (pending: TodayPendingOperation[], today: TodayViewModel): string[] => {
  const earliestReorder = pending
    .filter((operation) => operation.kind === 'REORDER' && operation.rollbackOrder !== undefined)
    .sort((left, right) => left.sequence - right.sequence)[0];

  return earliestReorder?.rollbackOrder ?? currentOrder(today);
};

const applyReorderMove = (orderedItemIds: string[], operation: TodayPendingOperation): string[] => {
  if (!operation.reorderDirection || !operation.reorderItemId) return orderedItemIds;
  const currentIndex = orderedItemIds.indexOf(operation.reorderItemId);
  const targetIndex = operation.reorderDirection === 'UP' ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedItemIds.length) return orderedItemIds;
  const nextOrder = [...orderedItemIds];
  [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];
  return nextOrder;
};

const replayPendingReorders = (today: TodayViewModel, baseOrder: string[], pending: TodayPendingOperation[]): TodayViewModel => {
  const replayedOrder = pending
    .filter((operation) => operation.kind === 'REORDER' && operation.rollbackOrder !== undefined)
    .sort((left, right) => left.sequence - right.sequence)
    .reduce(applyReorderMove, baseOrder);

  return withOrder(today, replayedOrder);
};

const appendRetry = (message: string): string => `${message}${/[.!?]$/.test(message) ? '' : '.'} Try again.`;

const unknownError = (message: string): TodayClientError => ({ code: 'UNKNOWN', message, retryable: true });

const failureInterpretation = (error: TodayClientError): TodayActionInterpretation => ({
  error,
  kind: 'FAILURE',
  outcome: { error, ok: false, preserveInput: true },
});

export const interpretTodayActionResult = (response: TodayActionEnvelope): TodayActionInterpretation => {
  if (response.serverError) return failureInterpretation(unknownError(response.serverError));
  if (response.validationErrors) {
    return failureInterpretation({ code: 'VALIDATION_ERROR', message: 'Check the highlighted fields.', retryable: false });
  }
  if (!response.data) return failureInterpretation(unknownError('The action did not return a result'));
  if (response.data.ok) return { kind: 'SUCCESS', outcome: { ok: true, preserveInput: false }, snapshot: response.data.data };
  if (response.data.error.code === 'CONFLICT') {
    return {
      canonical: response.data.canonical,
      error: response.data.error,
      kind: 'CONFLICT',
      outcome: { error: response.data.error, ok: false, preserveInput: true },
    };
  }
  return failureInterpretation(response.data.error);
};

export const staleTodayActionOutcome = (): TodayActionOutcome => ({
  error: { code: 'STALE', message: 'A newer result was already applied.', retryable: true },
  ok: false,
  preserveInput: true,
  stale: true,
});

const successNotice = (key: TodayOperationKey): string => {
  if (key.kind === 'TRANSITION') return 'Task started.';
  if (key.kind === 'REORDER') return 'Plan order saved.';
  if (key.kind === 'CREATE') return 'Task added to Today.';
  return 'Today updated.';
};

const failureNotice = (key: TodayOperationKey, error: TodayClientError): string => {
  if (!error.retryable) return error.message;
  if (key.kind === 'REORDER') return 'Could not reorder the plan. Try again.';
  return appendRetry(error.message);
};

const conflictNotice = (error: TodayClientError, hasCanonical: boolean): string => {
  if (hasCanonical) return error.retryable ? 'The plan changed elsewhere. The server state is shown; you can retry.' : 'The plan changed elsewhere. The server state is shown.';
  return error.retryable ? 'The server state could not be confirmed. Try again.' : error.message;
};

const invalidateRollbackOrders = (pending: TodayPendingOperation[], settledKey: TodayOperationKey): TodayPendingOperation[] =>
  pending.map((operation) => {
    if (operation.kind !== 'REORDER' || sameKey(operation, settledKey) || operation.rollbackOrder === undefined) return operation;
    const withoutRollback = { ...operation };
    delete withoutRollback.reorderDirection;
    delete withoutRollback.reorderItemId;
    delete withoutRollback.rollbackOrder;
    return withoutRollback;
  });

export const createTodayClientState = (today: TodayViewModel): TodayClientState => ({
  error: null,
  latestAppliedSequence: 0,
  notice: null,
  pending: [],
  today,
});

export const isTodayOperationPending = (state: TodayClientState, key: TodayOperationKey): boolean =>
  findPending(state.pending, key) !== undefined;

export const todayReducer = (state: TodayClientState, event: TodayReducerEvent): TodayClientState => {
  if (event.type === 'RESET') {
    const pending = event.key ? removePending(state.pending, event.key) : [];
    return { ...state, error: null, notice: null, pending };
  }

  if (event.type === 'REQUEST') {
    const current = findPending(state.pending, event.key);
    if (current && event.sequence <= current.sequence) return state;
    const pending = [...removePending(state.pending, event.key), { ...event.key, sequence: event.sequence }];
    return {
      ...state,
      error: null,
      notice: null,
      pending,
    };
  }

  if (event.type === 'OPTIMISTIC_REORDER') {
    const operation = isCurrentSettlement(state.pending, event.key, event.sequence);
    if (!operation) return state;
    const rollbackOrder = authoritativeRollbackOrder(state.pending, state.today);
    const reorderItemId = state.today.items.find((item) => item.taskId === event.key.itemId)?.id;
    const currentIndex = reorderItemId ? currentOrder(state.today).indexOf(reorderItemId) : -1;
    const targetIndex = reorderItemId ? event.orderedItemIds.indexOf(reorderItemId) : -1;
    const reorderDirection: TodayPendingOperation['reorderDirection'] = targetIndex < currentIndex ? 'UP' : 'DOWN';
    const pending = state.pending.map((candidate) =>
      sameKey(candidate, event.key) && candidate.sequence === event.sequence
        ? {
            ...candidate,
            reorderDirection,
            reorderItemId,
            rollbackOrder: candidate.rollbackOrder ?? rollbackOrder,
          }
        : candidate
    );
    return { ...state, pending, today: withOrder(state.today, event.orderedItemIds) };
  }

  const operation = isCurrentSettlement(state.pending, event.key, event.sequence);
  if (!operation) return state;

  if (event.type === 'SUCCESS') {
    if (event.snapshot.revision < state.today.revision) {
      return { ...state, pending: removePending(state.pending, event.key) };
    }
    const pending = invalidateRollbackOrders(removePending(state.pending, event.key), event.key);
    return {
      error: null,
      latestAppliedSequence: Math.max(state.latestAppliedSequence, event.sequence),
      notice: event.notice ?? successNotice(event.key),
      pending,
      today: event.snapshot,
    };
  }

  if (event.type === 'CONFLICT') {
    const pending = removePending(state.pending, event.key);
    if (event.canonical) {
      if (event.canonical.revision < state.today.revision) return { ...state, pending };
      return {
        error: event.error,
        latestAppliedSequence: Math.max(state.latestAppliedSequence, event.sequence),
        notice: conflictNotice(event.error, true),
        pending: invalidateRollbackOrders(pending, event.key),
        today: event.canonical,
      };
    }
    return {
      error: event.error,
      latestAppliedSequence: state.latestAppliedSequence,
      notice: conflictNotice(event.error, false),
      pending,
      today: state.today,
    };
  }

  if (event.sequence < state.latestAppliedSequence) {
    return { ...state, pending: removePending(state.pending, event.key) };
  }

  const pending = removePending(state.pending, event.key);
  return {
    error: event.error,
    latestAppliedSequence: state.latestAppliedSequence,
    notice: failureNotice(event.key, event.error),
    pending,
    today: operation.rollbackOrder ? replayPendingReorders(state.today, operation.rollbackOrder, pending) : state.today,
  };
};
