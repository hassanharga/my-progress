import type { CSSProperties, ReactNode } from 'react';

import type { ExecutionState } from '@/server/tasks/task-transition-types';

export type RunwayPhase = 'ready' | 'active' | 'paused' | 'complete' | 'overrun' | 'unplanned' | 'cancelled';

export type RunwayModel = {
  label: string;
  percent: number;
  phase: RunwayPhase;
  remainingText: string;
};

type RunwayInput = {
  elapsedSeconds: number;
  plannedMinutes: number | null;
  status: ExecutionState;
};

export type TimeRunwayProps = RunwayInput & {
  className?: string;
};

const roundedMinutes = (seconds: number): number => Math.max(0, Math.round(seconds / 60));

export const formatRunwayDuration = (seconds: number): string => {
  const minutes = roundedMinutes(seconds);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
};

export const getRunwayModel = ({ elapsedSeconds, plannedMinutes, status }: RunwayInput): RunwayModel => {
  const safeElapsed = Math.max(0, elapsedSeconds);
  const plannedSeconds = Math.max(0, plannedMinutes ?? 0) * 60;
  const elapsedText = formatRunwayDuration(safeElapsed);
  const percent = plannedSeconds === 0 ? 0 : Math.min(100, Math.max(0, Math.round((safeElapsed / plannedSeconds) * 100)));

  if (status === 'COMPLETED') {
    return {
      label: 'Complete',
      percent,
      phase: 'complete',
      remainingText: plannedSeconds === 0 ? `Completed in ${elapsedText} · no estimate` : `Completed in ${elapsedText} · ${formatRunwayDuration(plannedSeconds)} planned`,
    };
  }
  if (status === 'CANCELLED') {
    return {
      label: 'Cancelled',
      percent,
      phase: 'cancelled',
      remainingText: plannedSeconds === 0 ? `Stopped at ${elapsedText} · no estimate` : `Stopped at ${elapsedText} · ${formatRunwayDuration(plannedSeconds)} planned`,
    };
  }

  if (plannedSeconds === 0) {
    return {
      label: 'No estimate',
      percent: 0,
      phase: 'unplanned',
      remainingText: `Unplanned · ${formatRunwayDuration(safeElapsed)} elapsed`,
    };
  }

  const plannedText = formatRunwayDuration(plannedSeconds);
  if (safeElapsed > plannedSeconds) {
    return {
      label: 'Over plan',
      percent: 100,
      phase: 'overrun',
      remainingText: `${formatRunwayDuration(safeElapsed - plannedSeconds)} over · ${elapsedText} elapsed`,
    };
  }
  if (status === 'READY') {
    return { label: 'Ready', percent, phase: 'ready', remainingText: `${plannedText} planned` };
  }
  if (status === 'PAUSED') {
    return {
      label: 'Paused',
      percent,
      phase: 'paused',
      remainingText: `${formatRunwayDuration(plannedSeconds - safeElapsed)} remaining · ${elapsedText} elapsed`,
    };
  }
  return {
    label: 'In progress',
    percent,
    phase: 'active',
    remainingText: `${formatRunwayDuration(plannedSeconds - safeElapsed)} remaining · ${elapsedText} elapsed`,
  };
};

export function TimeRunway({ className, elapsedSeconds, plannedMinutes, status }: TimeRunwayProps): ReactNode {
  const model = getRunwayModel({ elapsedSeconds, plannedMinutes, status });
  const planned = Math.max(0, plannedMinutes ?? 0);
  const elapsed = roundedMinutes(elapsedSeconds);
  const runwayStyle = { '--today-runway-progress': `${model.percent}%` } as CSSProperties;

  return (
    <section className={['today-runway', className].filter(Boolean).join(' ')} data-phase={model.phase} aria-label="Task time">
      <div className="today-runway__labels">
        <span className="today-runway__state">{model.label}</span>
        <span className="today-runway__time">{model.remainingText}</span>
      </div>
      {planned > 0 ? (
        <div
          aria-label="Time runway for current task"
          aria-valuemax={planned}
          aria-valuemin={0}
          aria-valuenow={Math.min(elapsed, planned)}
          aria-valuetext={model.remainingText}
          className="today-runway__track"
          role="progressbar"
          style={runwayStyle}
        >
          <span aria-hidden="true" className="today-runway__fill" />
          <span aria-hidden="true" className="today-runway__ticks" />
        </div>
      ) : (
        <div className="today-runway__track today-runway__track--unplanned" aria-hidden="true">
          <span className="today-runway__ticks" />
        </div>
      )}
      <div className="today-runway__scale" aria-hidden="true">
        <span>0</span>
        <span>{planned > 0 ? `${planned}m plan` : 'Open runway'}</span>
      </div>
    </section>
  );
}
