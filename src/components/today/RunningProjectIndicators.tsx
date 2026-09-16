'use client';

import type { ReactNode } from 'react';

import type { TodayRunningIndicator } from '@/server/today/today-types';

import { useTodayClock } from './FocusDock';
import { formatRunwayDuration } from './TimeRunway';

export type RunningProjectIndicatorsProps = {
  indicators: TodayRunningIndicator[];
  onSelect?: (taskId: string) => void;
};

const indicatorElapsed = (indicator: TodayRunningIndicator, nowMs: number, snapshotNowMs: number): number =>
  indicator.elapsedSeconds + Math.max(0, Math.floor((nowMs - snapshotNowMs) / 1_000));

export function RunningProjectIndicators({ indicators, onSelect }: RunningProjectIndicatorsProps): ReactNode {
  const { nowMs, snapshotNowMs } = useTodayClock();
  if (indicators.length === 0) return null;

  return (
    <section aria-label="Work running in other projects" className="today-running-projects">
      <p className="today-running-projects__label">Also running</p>
      <ul className="today-running-projects__list">
        {indicators.map((indicator) => {
          const content = (
            <>
              <span className="today-running-projects__pulse" aria-hidden="true" />
              <span className="today-running-projects__copy">
                <strong>{indicator.project.name}</strong>
                <span>{indicator.title}</span>
              </span>
              <span className="today-running-projects__time"><span className="sr-only">Running for </span>{formatRunwayDuration(indicatorElapsed(indicator, nowMs, snapshotNowMs))}</span>
              <span className="today-running-projects__state">Running</span>
            </>
          );

          return (
            <li key={indicator.sessionId}>
              {onSelect ? (
                <button className="today-running-projects__indicator" onClick={() => onSelect(indicator.taskId)} type="button">{content}</button>
              ) : (
                <div className="today-running-projects__indicator">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
