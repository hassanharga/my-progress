'use client';

import { createContext, useCallback, useContext, useReducer, useRef, useState, type ReactNode } from 'react';
import { useAction } from 'next-safe-action/hooks';

import { createTodayTask, mutateToday, transitionTodayTask } from '@/actions/today';
import type { CreateTodayTaskInput, TodayMutationInput, TransitionTodayTaskInput } from '@/schema/today';
import type { TodayViewModel } from '@/server/today/today-types';

import {
  createTodayClientState,
  interpretTodayActionResult,
  isTodayOperationPending,
  staleTodayActionOutcome,
  todayReducer,
  type TodayClientState,
  type TodayActionEnvelope,
  type TodayActionInterpretation,
  type TodayActionOutcome,
  type TodayOperationKey,
} from './today-reducer';
import { BacklogPicker } from './BacklogPicker';
import { CarryoverReview, type CarryoverOperation } from './CarryoverReview';
import { DailySummary } from './DailySummary';
import { FocusDock, TodayClockProvider } from './FocusDock';
import { InlineTaskForm } from './InlineTaskForm';
import { RunningProjectIndicators } from './RunningProjectIndicators';
import { TodayHeader } from './TodayHeader';
import { TodayList } from './TodayList';
import type { TodayRowOperation } from './TodayRow';

export type TodayCockpitActions = {
  createTask: (input: CreateTodayTaskInput) => Promise<TodayActionOutcome>;
  isPending: (key: TodayOperationKey) => boolean;
  moveItem: (taskId: string, direction: 'UP' | 'DOWN') => Promise<TodayActionOutcome>;
  mutate: (input: TodayMutationInput) => Promise<TodayActionOutcome>;
  transition: (input: TransitionTodayTaskInput['transition']) => Promise<TodayActionOutcome>;
};

export type TodayCockpitContextValue = TodayClientState & TodayCockpitActions;

export type TodayCockpitProps = {
  initialToday: TodayViewModel;
};

const TodayCockpitContext = createContext<TodayCockpitContextValue | null>(null);

const operationKeyForMutation = (input: TodayMutationInput): TodayOperationKey => ({
  itemId: 'taskId' in input ? input.taskId : undefined,
  kind: input.type,
});

const operationKeyForTransition = (taskId: string): TodayOperationKey => ({
  itemId: taskId,
  kind: 'TRANSITION',
});

const operationToken = (key: TodayOperationKey): string => `${key.kind}:${key.itemId ?? ''}`;

const noOpOutcome = (message: string): TodayActionOutcome => ({
  error: { code: 'NO_OP', message, retryable: false },
  ok: false,
  preserveInput: true,
});

export const useTodayCockpit = (): TodayCockpitContextValue => {
  const context = useContext(TodayCockpitContext);
  if (!context) throw new Error('useTodayCockpit must be used within TodayCockpit');
  return context;
};

export function TodayCockpit({ initialToday }: TodayCockpitProps): ReactNode {
  const [state, dispatch] = useReducer(todayReducer, initialToday, createTodayClientState);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const sequenceRef = useRef(0);
  const pendingSequencesRef = useRef<Record<string, number>>({});

  const { executeAsync: executeMutation } = useAction(mutateToday);
  const { executeAsync: executeTransition } = useAction(transitionTodayTask);
  const { executeAsync: executeCreate } = useAction(createTodayTask);

  const settle = useCallback(async (
    key: TodayOperationKey,
    execute: () => Promise<unknown>,
    orderedItemIds?: string[],
    settledNotice?: string
  ): Promise<TodayActionOutcome> => {
    const sequence = sequenceRef.current + 1;
    setLocalNotice(null);
    sequenceRef.current = sequence;
    const token = operationToken(key);
    pendingSequencesRef.current[token] = sequence;
    dispatch({ key, sequence, type: 'REQUEST' });
    if (orderedItemIds) dispatch({ key, orderedItemIds, sequence, type: 'OPTIMISTIC_REORDER' });

    const apply = (interpretation: TodayActionInterpretation): TodayActionOutcome => {
      const isCurrent = pendingSequencesRef.current[token] === sequence;
      if (!isCurrent) {
        if (interpretation.kind === 'SUCCESS') {
          dispatch({ key, notice: settledNotice, sequence, snapshot: interpretation.snapshot, type: 'SUCCESS' });
        } else if (interpretation.kind === 'CONFLICT') {
          dispatch({ key, sequence, canonical: interpretation.canonical, error: interpretation.error, type: 'CONFLICT' });
        } else {
          dispatch({ error: interpretation.error, key, sequence, type: 'FAILURE' });
        }
        return staleTodayActionOutcome();
      }

      if (interpretation.kind === 'SUCCESS') {
        dispatch({ key, notice: settledNotice, sequence, snapshot: interpretation.snapshot, type: 'SUCCESS' });
      } else if (interpretation.kind === 'CONFLICT') {
        dispatch({ key, sequence, canonical: interpretation.canonical, error: interpretation.error, type: 'CONFLICT' });
      } else {
        dispatch({ error: interpretation.error, key, sequence, type: 'FAILURE' });
      }
      delete pendingSequencesRef.current[token];
      return interpretation.outcome;
    };

    try {
      const response = (await execute()) as TodayActionEnvelope;
      return apply(interpretTodayActionResult(response));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The action could not be completed';
      return apply({
        error: { code: 'UNKNOWN', message, retryable: true },
        kind: 'FAILURE',
        outcome: { error: { code: 'UNKNOWN', message, retryable: true }, ok: false, preserveInput: true },
      });
    }
  }, []);

  const mutate = useCallback(
    (input: TodayMutationInput) => settle(operationKeyForMutation(input), () => executeMutation(input)),
    [executeMutation, settle]
  );

  const transition = useCallback(
    (input: TransitionTodayTaskInput['transition']) => {
      const key = operationKeyForTransition(input.taskId);
      const notice = input.event === 'START' ? 'Task started.' : input.event === 'PAUSE' ? 'Task paused.' : input.event === 'COMPLETE' ? 'Task completed.' : 'Task cancelled.';
      return settle(key, () => executeTransition({ planDate: state.today.planDate, transition: input }), undefined, notice);
    },
    [executeTransition, settle, state.today.planDate]
  );

  const createTask = useCallback((input: CreateTodayTaskInput) => settle({ kind: 'CREATE' }, () => executeCreate(input)), [executeCreate, settle]);

  const moveItem = useCallback(
    (taskId: string, direction: 'UP' | 'DOWN') => {
      const currentItems = state.today.items;
      const currentIndex = currentItems.findIndex((item) => item.taskId === taskId);
      const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentItems.length) return Promise.resolve(noOpOutcome('This item is already at the edge of the plan.'));
      const orderedItemIds = currentItems.map((item) => item.id);
      [orderedItemIds[currentIndex], orderedItemIds[targetIndex]] = [orderedItemIds[targetIndex], orderedItemIds[currentIndex]];
      return settle(
        { itemId: taskId, kind: 'REORDER' },
        () => executeMutation({ direction, planDate: state.today.planDate, taskId, type: 'MOVE' }),
        orderedItemIds
      );
    },
    [executeMutation, settle, state.today.items, state.today.planDate]
  );

  const contextValue: TodayCockpitContextValue = {
    ...state,
    createTask,
    isPending: (key) => isTodayOperationPending(state, key),
    moveItem,
    mutate,
    transition,
  };
  const planDate = state.today.planDate;
  const focusTaskId = state.today.focus?.taskId;
  const transitionPending = focusTaskId
    ? isTodayOperationPending(state, { itemId: focusTaskId, kind: 'TRANSITION' })
    : false;
  const otherRunning = state.today.runningIndicators.filter(({ taskId }) => taskId !== focusTaskId);

  const rowPending = (taskId: string, operation: TodayRowOperation): boolean => {
    const kind =
      operation === 'move'
        ? 'REORDER'
        : operation === 'planned-minutes'
          ? 'UPDATE_PLANNED_MINUTES'
          : operation === 'return-to-backlog'
            ? 'RETURN_TO_BACKLOG'
            : 'TRANSITION';
    return isTodayOperationPending(state, { itemId: taskId, kind });
  };

  const carryoverPending = (taskId: string, operation: CarryoverOperation): boolean => {
    const kind = operation === 'keep' ? 'KEEP_TODAY' : operation === 'move' ? 'MOVE_TO_DATE' : 'RETURN_TO_BACKLOG';
    return isTodayOperationPending(state, { itemId: taskId, kind });
  };

  const sourcePlanDateFor = (taskId: string): string | null =>
    state.today.carryover.find((item) => item.taskId === taskId)?.sourcePlanDate ?? null;

  return (
    <TodayCockpitContext.Provider value={contextValue}>
      <section aria-labelledby="today-cockpit-heading" className="mx-auto w-full max-w-7xl space-y-300 p-200 sm:p-300 lg:p-400">
        <TodayHeader
          actions={(
            <>
              <BacklogPicker
                backlog={state.today.backlog}
                onAdd={(taskId, plannedMinutes) => mutate({ planDate: state.today.planDate, plannedMinutes, taskId, type: 'ADD' })}
              />
              <InlineTaskForm onCreate={createTask} planDate={state.today.planDate} projects={state.today.projects} />
            </>
          )}
          planDate={state.today.planDate}
          timezone={state.today.timezone}
          workload={state.today.workload}
        />
        <DailySummary summary={state.today.summary} workload={state.today.workload} />
        {state.today.projects.length === 0 ? (
          <section aria-labelledby="today-first-project-heading" className="rounded-lg border border-dashed border-border bg-surface p-250">
            <h2 id="today-first-project-heading" className="font-heading text-heading-small text-text">Create your first project</h2>
            <p className="mt-075 text-body text-text-subtle">Create a project from the project switcher, then add the first task to Today.</p>
          </section>
        ) : null}
        <div aria-label="Today updates">
          <p aria-live="polite" className="min-h-6 text-body-small text-text-subtle" role="status">{localNotice ?? state.notice ?? ''}</p>
          {state.error ? <p className="text-body-small text-danger-text" role="alert">{state.error.message}</p> : null}
        </div>
        <TodayClockProvider initialNowMs={Date.parse(state.today.generatedAt)}>
          <FocusDock
            focus={state.today.focus}
            onComplete={(taskId) => void transition({ event: 'COMPLETE', taskId })}
            onLog={() => setLocalNotice('Progress logging is not available yet. No changes were made.')}
            onPause={(taskId) => void transition({ event: 'PAUSE', taskId })}
            onStart={(taskId) => void transition({ event: 'START', taskId })}
            pending={{ complete: transitionPending, pause: transitionPending, start: transitionPending }}
          />
          <RunningProjectIndicators indicators={otherRunning} />
        </TodayClockProvider>
        <CarryoverReview
          isPending={carryoverPending}
          items={state.today.carryover}
          onKeepToday={(taskId, sourcePlanDate) =>
            void mutate({ planDate, sourcePlanDate, taskId, type: 'KEEP_TODAY' })
          }
          onMoveToDate={(taskId, targetPlanDate) => {
            const sourcePlanDate = sourcePlanDateFor(taskId);
            if (sourcePlanDate) {
              void mutate({
                planDate: sourcePlanDate,
                targetPlanDate,
                taskId,
                type: 'MOVE_TO_DATE',
                viewPlanDate: planDate,
              });
            }
          }}
          onReturnToBacklog={(taskId) => {
            const sourcePlanDate = sourcePlanDateFor(taskId);
            if (sourcePlanDate) {
              void mutate({ planDate: sourcePlanDate, taskId, type: 'RETURN_TO_BACKLOG', viewPlanDate: planDate });
            }
          }}
        />
        <TodayList
          isPending={rowPending}
          items={state.today.items}
          onMove={(taskId, direction) => void moveItem(taskId, direction)}
          onPlannedMinutesChange={(taskId, plannedMinutes) =>
            void mutate({ planDate, plannedMinutes, taskId, type: 'UPDATE_PLANNED_MINUTES' })
          }
          onReturnToBacklog={(taskId) =>
            void mutate({ planDate, taskId, type: 'RETURN_TO_BACKLOG', viewPlanDate: planDate })
          }
          onTransition={(taskId, event) => void transition({ event, taskId })}
        />
      </section>
    </TodayCockpitContext.Provider>
  );
}
