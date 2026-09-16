'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import type { TodayFocusItem } from '@/server/today/today-types';

import { formatRunwayDuration, TimeRunway } from './TimeRunway';

type TodayClockValue = {
  announcementNowMs: number;
  announcementTick: number;
  nowMs: number;
  snapshotNowMs: number;
};

export type TodayClockProviderProps = {
  announceEverySeconds?: number;
  children: ReactNode;
  initialNowMs: number;
  tickMs?: number;
};

const TodayClockContext = createContext<TodayClockValue | null>(null);

export function TodayClockProvider({ announceEverySeconds = 60, children, initialNowMs, tickMs = 1_000 }: TodayClockProviderProps): ReactNode {
  const [nowMs, setNowMs] = useState(initialNowMs);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), tickMs);
    return () => window.clearInterval(interval);
  }, [tickMs]);

  const announcementIntervalMs = Math.max(1, announceEverySeconds * 1_000);
  const announcementTick = Math.floor(nowMs / announcementIntervalMs);
  const announcementNowMs = announcementTick * announcementIntervalMs;
  const value = useMemo(
    () => ({ announcementNowMs, announcementTick, nowMs, snapshotNowMs: initialNowMs }),
    [announcementNowMs, announcementTick, initialNowMs, nowMs]
  );
  return <TodayClockContext.Provider value={value}>{children}</TodayClockContext.Provider>;
}

export const useTodayClock = (): TodayClockValue => {
  const clock = useContext(TodayClockContext);
  if (!clock) throw new Error('Today time-aware components must be wrapped in TodayClockProvider');
  return clock;
};

export type FocusDockAction = 'start' | 'pause' | 'complete' | 'log';

export type FocusDockProps = {
  focus: TodayFocusItem | null;
  onComplete: (taskId: string) => void;
  onLog: (taskId: string) => void;
  onPause: (taskId: string) => void;
  onStart: (taskId: string) => void;
  pending?: Partial<Record<FocusDockAction, boolean>>;
};

const getElapsedSeconds = (focus: TodayFocusItem, nowMs: number, snapshotNowMs: number): number => {
  if (focus.status !== 'IN_PROGRESS' || !focus.openSessionStartedAt) return focus.actualSeconds;
  const activeSeconds = Math.max(0, Math.floor((nowMs - snapshotNowMs) / 1_000));
  return focus.actualSeconds + activeSeconds;
};

export function FocusDock({ focus, onComplete, onLog, onPause, onStart, pending = {} }: FocusDockProps): ReactNode {
  const { announcementNowMs, announcementTick, nowMs, snapshotNowMs } = useTodayClock();

  if (!focus) {
    return (
      <section aria-labelledby="today-focus-heading" className="today-focus-dock today-focus-dock--empty">
        <p className="today-focus-dock__eyebrow">Current focus</p>
        <h2 id="today-focus-heading" className="today-focus-dock__title">No task in focus</h2>
        <p className="today-focus-dock__empty-copy">Start a task from today’s plan to bring its next step and time runway here.</p>
      </section>
    );
  }

  const elapsedSeconds = getElapsedSeconds(focus, nowMs, snapshotNowMs);
  const announcedElapsedSeconds = getElapsedSeconds(focus, announcementNowMs, snapshotNowMs);
  const isOpen = focus.status !== 'COMPLETED' && focus.status !== 'CANCELLED';
  const canStart = focus.status === 'READY' || focus.status === 'PAUSED';
  const canPause = focus.status === 'IN_PROGRESS';
  const hasLiveTimer = canPause && focus.openSessionStartedAt !== null;

  return (
    <section aria-labelledby="today-focus-heading" className="today-focus-dock" data-status={focus.status}>
      <div className="today-focus-dock__identity">
        <div>
          <p className="today-focus-dock__eyebrow">Current focus · {focus.project.name}</p>
          <h2 id="today-focus-heading" className="today-focus-dock__title">{focus.title}</h2>
        </div>
        <span className="today-focus-dock__status">{focus.status === 'IN_PROGRESS' ? 'Running' : focus.status === 'PAUSED' ? 'Paused' : focus.status === 'READY' ? 'Ready' : focus.status === 'COMPLETED' ? 'Complete' : 'Cancelled'}</span>
      </div>

      <div aria-hidden="true" className="today-focus-dock__clock">
        <span className="today-focus-dock__clock-value">{formatRunwayDuration(elapsedSeconds)}</span>
        <span>elapsed</span>
      </div>
      {hasLiveTimer ? (
        <p aria-atomic="true" aria-live="polite" className="sr-only" key={announcementTick}>
          {formatRunwayDuration(announcedElapsedSeconds)} elapsed on {focus.title}
        </p>
      ) : null}

      <TimeRunway elapsedSeconds={elapsedSeconds} plannedMinutes={focus.plannedMinutes} status={focus.status} />

      <div className="today-focus-dock__next-step">
        <span>Next step</span>
        <p>{focus.currentNextStep ?? 'Choose the next concrete step before you continue.'}</p>
      </div>

      <div aria-label="Current task actions" className="today-focus-dock__actions" role="group">
        {canStart ? <Button className="min-h-11" disabled={pending.start} onClick={() => onStart(focus.taskId)} type="button">Start task</Button> : null}
        {canPause ? <Button className="min-h-11" disabled={pending.pause} onClick={() => onPause(focus.taskId)} type="button" variant="warning">Pause task</Button> : null}
        {isOpen ? <Button className="min-h-11" disabled={pending.complete} onClick={() => onComplete(focus.taskId)} type="button" variant="default">Complete task</Button> : null}
        <Button className="min-h-11" disabled={pending.log} onClick={() => onLog(focus.taskId)} type="button" variant="subtle">Log progress</Button>
      </div>
    </section>
  );
}
