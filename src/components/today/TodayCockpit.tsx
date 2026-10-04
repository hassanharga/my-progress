'use client';

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { CreateTodayTaskInput, TodayMutationInput, TransitionTodayTaskInput } from '@/schema/today';
import type { TodayViewModel } from '@/server/today/today-types';
import { useAction } from 'next-safe-action/hooks';

import type { AccountProfile } from '@/types/user';
import { createTodayTask, mutateToday, transitionTodayTask } from '@/actions/today';
import { saveFirstUseTimezone } from '@/actions/user';
import TimezoneGuide, { type TimezoneSaveOutcome } from '@/components/onboarding/TimezoneGuide';

import { BacklogPicker } from './BacklogPicker';
import { CarryoverReview, type CarryoverOperation } from './CarryoverReview';
import { DailySummary } from './DailySummary';
import { FocusDock, TodayClockProvider } from './FocusDock';
import { InlineTaskForm } from './InlineTaskForm';
import { RunningProjectIndicators } from './RunningProjectIndicators';
import {
  createTodayClientState,
  interpretTodayActionResult,
  isTodayOperationPending,
  staleTodayActionOutcome,
  todayReducer,
  type TodayActionEnvelope,
  type TodayActionInterpretation,
  type TodayActionOutcome,
  type TodayClientState,
  type TodayOperationKey,
} from './today-reducer';
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
  focusTaskCreation?: boolean;
  setupProfile?: AccountProfile;
  onProfileApplied?: (profile: AccountProfile) => void;
  externalPreferencesBlocked?: boolean;
  canonicalSetup?: { today: TodayViewModel; profile: AccountProfile };
  onSetupApplied?: () => void;
  onSetupRejected?: () => void;
  onActivityChange?: (active: boolean) => void;
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

export function TodayCockpit({
  initialToday,
  focusTaskCreation = false,
  setupProfile,
  onProfileApplied,
  externalPreferencesBlocked = false,
  canonicalSetup,
  onSetupApplied,
  onSetupRejected,
  onActivityChange,
}: TodayCockpitProps): ReactNode {
  const [state, dispatch] = useReducer(todayReducer, initialToday, (today) => ({
    ...createTodayClientState(today),
    profile: setupProfile,
  }));
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [setupVisible, setSetupVisible] = useState(true);
  const [preferencesBlocked, setPreferencesBlocked] = useState(false);
  const [taskUnconfirmed, setTaskUnconfirmed] = useState(false);
  const preferencesBlockedRef = useRef(false);
  const taskUnconfirmedRef = useRef(false);
  const currentToday = useRef(state.today);
  useEffect(() => {
    currentToday.current = state.today;
  }, [state.today]);
  const sequenceRef = useRef(0);
  const pendingSequencesRef = useRef<Record<string, number>>({});
  const appliedSetup = useRef<typeof canonicalSetup>(undefined);
  useEffect(() => {
    if (!canonicalSetup || appliedSetup.current === canonicalSetup) return;
    appliedSetup.current = canonicalSetup;
    const key = { kind: 'PREFERENCE_REFRESH' };
    const sequence = ++sequenceRef.current;
    dispatch({ key, sequence, type: 'REQUEST' });
    if (canonicalSetup.today.revision < state.today.revision) {
      dispatch({
        key,
        sequence,
        type: 'FAILURE',
        error: { code: 'CONFLICT', message: 'The daily plan changed. Retry the timezone check.', retryable: true },
      });
      onSetupRejected?.();
      return;
    }
    dispatch({ key, sequence, type: 'SUCCESS', snapshot: canonicalSetup.today, profile: canonicalSetup.profile });
  }, [canonicalSetup, state.today, state.profile, onSetupRejected]);
  useEffect(() => {
    if (canonicalSetup && state.today === canonicalSetup.today && state.profile === canonicalSetup.profile)
      onSetupApplied?.();
  }, [canonicalSetup, state.today, state.profile, onSetupApplied]);

  const { executeAsync: executeMutation } = useAction(mutateToday);
  const { executeAsync: executeTransition } = useAction(transitionTodayTask);
  const { executeAsync: executeCreate } = useAction(createTodayTask);
  const { executeAsync: executeTimezone } = useAction(saveFirstUseTimezone);
  const appliedProfile = useRef<AccountProfile | undefined>(undefined);
  useEffect(() => {
    if (state.profile && state.profile !== appliedProfile.current) {
      appliedProfile.current = state.profile;
      onProfileApplied?.(state.profile);
    }
  }, [state.profile, onProfileApplied]);

  const settle = useCallback(
    async (
      key: TodayOperationKey,
      execute: () => Promise<unknown>,
      orderedItemIds?: string[],
      settledNotice?: string
    ): Promise<TodayActionOutcome> => {
      if (preferencesBlockedRef.current || externalPreferencesBlocked)
        return noOpOutcome('Confirm your timezone and daily plan before changing tasks.');
      const sequence = sequenceRef.current + 1;
      setLocalNotice(null);
      sequenceRef.current = sequence;
      const token = operationToken(key);
      pendingSequencesRef.current[token] = sequence;
      onActivityChange?.(true);
      dispatch({ key, sequence, type: 'REQUEST' });
      if (orderedItemIds) dispatch({ key, orderedItemIds, sequence, type: 'OPTIMISTIC_REORDER' });

      const apply = (interpretation: TodayActionInterpretation): TodayActionOutcome => {
        const isCurrent = pendingSequencesRef.current[token] === sequence;
        if (!isCurrent) {
          if (interpretation.kind === 'SUCCESS') {
            dispatch({ key, notice: settledNotice, sequence, snapshot: interpretation.snapshot, type: 'SUCCESS' });
          } else if (interpretation.kind === 'CONFLICT') {
            dispatch({
              key,
              sequence,
              canonical: interpretation.canonical,
              error: interpretation.error,
              type: 'CONFLICT',
            });
          } else {
            dispatch({ error: interpretation.error, key, sequence, type: 'FAILURE' });
          }
          return staleTodayActionOutcome();
        }

        if (interpretation.kind === 'SUCCESS') {
          dispatch({ key, notice: settledNotice, sequence, snapshot: interpretation.snapshot, type: 'SUCCESS' });
        } else if (interpretation.kind === 'CONFLICT') {
          dispatch({
            key,
            sequence,
            canonical: interpretation.canonical,
            error: interpretation.error,
            type: 'CONFLICT',
          });
        } else {
          dispatch({ error: interpretation.error, key, sequence, type: 'FAILURE' });
        }
        if (key.kind === 'CREATE') {
          const unconfirmed =
            !interpretation.outcome.ok &&
            (interpretation.outcome.stale === true || interpretation.outcome.error.retryable);
          taskUnconfirmedRef.current = unconfirmed;
          setTaskUnconfirmed(unconfirmed);
        }
        delete pendingSequencesRef.current[token];
        onActivityChange?.(Object.keys(pendingSequencesRef.current).length > 0 || taskUnconfirmedRef.current);
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
    },
    [externalPreferencesBlocked, onActivityChange]
  );

  const mutate = useCallback(
    (input: TodayMutationInput) => settle(operationKeyForMutation(input), () => executeMutation(input)),
    [executeMutation, settle]
  );

  const transition = useCallback(
    (input: TransitionTodayTaskInput['transition']) => {
      const key = operationKeyForTransition(input.taskId);
      const notice =
        input.event === 'START'
          ? 'Task started.'
          : input.event === 'PAUSE'
            ? 'Task paused.'
            : input.event === 'COMPLETE'
              ? 'Task completed.'
              : 'Task cancelled.';
      return settle(
        key,
        () => executeTransition({ planDate: state.today.planDate, transition: input }),
        undefined,
        notice
      );
    },
    [executeTransition, settle, state.today.planDate]
  );

  const createTask = useCallback(
    async (input: CreateTodayTaskInput) => {
      if (preferencesBlockedRef.current || externalPreferencesBlocked)
        return noOpOutcome('Confirm your timezone and daily plan before creating a task.');
      const outcome = await settle({ kind: 'CREATE' }, () => executeCreate(input));
      const unconfirmed = !outcome.ok && (outcome.stale === true || outcome.error.retryable);
      taskUnconfirmedRef.current = unconfirmed;
      setTaskUnconfirmed(unconfirmed);
      if (outcome.ok) setSetupVisible(false);
      return outcome;
    },
    [executeCreate, settle, externalPreferencesBlocked]
  );

  const saveTimezone = async (timezone: string): Promise<TimezoneSaveOutcome> => {
    if (Object.keys(pendingSequencesRef.current).length || taskUnconfirmedRef.current)
      return { ok: false, message: 'Finish or retry the task submission before changing timezone.' };
    const key = { kind: 'PREFERENCE_REFRESH' };
    const token = operationToken(key);
    const sequence = ++sequenceRef.current;
    pendingSequencesRef.current[token] = sequence;
    preferencesBlockedRef.current = true;
    setPreferencesBlocked(true);
    dispatch({ key, sequence, type: 'REQUEST' });
    try {
      const response = await executeTimezone({ timezone });
      const result = response?.data;
      if (pendingSequencesRef.current[token] !== sequence)
        return { ok: false, message: 'A newer timezone check is in progress.' };
      if (result?.ok && result.data.today.revision >= currentToday.current.revision) {
        dispatch({
          key,
          sequence,
          type: 'SUCCESS',
          snapshot: result.data.today,
          profile: result.data.profile,
          notice: 'Timezone and daily plan updated.',
        });
        preferencesBlockedRef.current = false;
        setPreferencesBlocked(false);
        return { ok: true };
      }
      const error =
        result && !result.ok
          ? result.error
          : {
              code: 'CONFLICT',
              message: 'Could not confirm the current timezone and daily plan. Retry the same timezone.',
              retryable: true,
            };
      dispatch({ key, sequence, type: 'FAILURE', error });
      return { ok: false, message: error.message };
    } catch {
      const error = {
        code: 'UNKNOWN',
        message: 'Could not confirm the timezone. Retry the same timezone.',
        retryable: true,
      };
      dispatch({ key, sequence, type: 'FAILURE', error });
      return { ok: false, message: error.message };
    } finally {
      if (pendingSequencesRef.current[token] === sequence) delete pendingSequencesRef.current[token];
    }
  };

  const moveItem = useCallback(
    (taskId: string, direction: 'UP' | 'DOWN') => {
      const currentItems = state.today.items;
      const currentIndex = currentItems.findIndex((item) => item.taskId === taskId);
      const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentItems.length)
        return Promise.resolve(noOpOutcome('This item is already at the edge of the plan.'));
      const orderedItemIds = currentItems.map((item) => item.id);
      [orderedItemIds[currentIndex], orderedItemIds[targetIndex]] = [
        orderedItemIds[targetIndex],
        orderedItemIds[currentIndex],
      ];
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
      <section
        aria-labelledby="today-cockpit-heading"
        className="mx-auto w-full max-w-7xl space-y-300 p-200 sm:p-300 lg:p-400"
      >
        {setupVisible && setupProfile && state.profile ? (
          <TimezoneGuide
            disabled={taskUnconfirmed || state.pending.some((operation) => operation.kind !== 'PREFERENCE_REFRESH')}
            onSave={saveTimezone}
            timezone={state.profile.timezone}
          />
        ) : null}
        <TodayHeader
          actions={
            <>
              <BacklogPicker
                backlog={state.today.backlog}
                onAdd={(taskId, plannedMinutes) =>
                  mutate({ planDate: state.today.planDate, plannedMinutes, taskId, type: 'ADD' })
                }
              />
              <InlineTaskForm
                disabled={preferencesBlocked || externalPreferencesBlocked}
                focusOnMount={focusTaskCreation}
                onCreate={createTask}
                planDate={state.today.planDate}
                projects={state.today.projects}
              />
            </>
          }
          planDate={state.today.planDate}
          timezone={state.today.timezone}
          workload={state.today.workload}
        />
        <DailySummary summary={state.today.summary} workload={state.today.workload} />
        {state.today.projects.length === 0 ? (
          <section
            aria-labelledby="today-first-project-heading"
            className="rounded-lg border border-dashed border-border bg-surface p-250"
          >
            <h2 id="today-first-project-heading" className="font-heading text-heading-small text-text">
              Create your first project
            </h2>
            <p className="mt-075 text-body text-text-subtle">
              Create a project from the project switcher, then add the first task to Today.
            </p>
          </section>
        ) : null}
        <div aria-label="Today updates">
          <p aria-live="polite" className="min-h-6 text-body-small text-text-subtle" role="status">
            {localNotice ?? state.notice ?? ''}
          </p>
          {state.error ? (
            <p className="text-body-small text-danger-text" role="alert">
              {state.error.message}
            </p>
          ) : null}
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
