import type { CSSProperties, ReactNode } from 'react';

import type { TodayWorkload } from '@/server/today/today-types';

export type WorkloadPresentation = {
  label: string;
  tone: 'neutral' | 'warning' | 'danger';
  warning: string | null;
};

export const formatTodayMinutes = (minutes: number): string => {
  const absoluteMinutes = Math.abs(Math.round(minutes));
  const hours = Math.floor(absoluteMinutes / 60);
  const remainder = absoluteMinutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
};

export const getWorkloadPresentation = (workload: TodayWorkload): WorkloadPresentation => {
  const planned = `${formatTodayMinutes(workload.plannedMinutes)} planned`;
  if (workload.state === 'unset' || workload.capacityMinutes === null) {
    return { label: `${planned} · No daily capacity set`, tone: 'neutral', warning: null };
  }

  const capacity = formatTodayMinutes(workload.capacityMinutes);
  if (workload.state === 'over') {
    const overage = formatTodayMinutes(Math.abs(workload.remainingMinutes ?? workload.plannedMinutes - workload.capacityMinutes));
    return {
      label: `${planned} of ${capacity} · ${overage} over capacity`,
      tone: 'danger',
      warning: `Your plan is ${overage} over capacity. You can still keep every task.`,
    };
  }

  const remaining = formatTodayMinutes(Math.max(0, workload.remainingMinutes ?? workload.capacityMinutes - workload.plannedMinutes));
  return {
    label: `${planned} of ${capacity} · ${remaining} remaining`,
    tone: workload.state === 'near' ? 'warning' : 'neutral',
    warning: null,
  };
};

export type TodayHeaderProps = {
  actions?: ReactNode;
  planDate: string;
  timezone: string;
  workload: TodayWorkload;
};

const formatPlanDate = (planDate: string): string => {
  const [year, month, day] = planDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
};

export function TodayHeader({ actions, planDate, timezone, workload }: TodayHeaderProps): ReactNode {
  const presentation = getWorkloadPresentation(workload);
  const progressValue = workload.utilizationPercent === null ? 0 : Math.min(100, Math.max(0, workload.utilizationPercent));

  return (
    <header className="today-plan-header">
      <div className="today-plan-header__identity">
        <p className="today-plan-header__eyebrow">Today · {timezone}</p>
        <h1 className="today-plan-header__title" id="today-cockpit-heading">{formatPlanDate(planDate)}</h1>
      </div>
      {actions ? <div aria-label="Add work to Today" className="today-plan-header__actions" role="group">{actions}</div> : null}
      <div className="today-workload" data-tone={presentation.tone}>
        <div className="today-workload__copy">
          <span>Daily workload</span>
          <strong>{presentation.label}</strong>
        </div>
        {workload.capacityMinutes === null ? null : (
          <div
            aria-label="Daily planned workload"
            aria-valuemax={workload.capacityMinutes}
            aria-valuemin={0}
            aria-valuenow={Math.min(workload.plannedMinutes, workload.capacityMinutes)}
            aria-valuetext={presentation.label}
            className="today-workload__meter"
            role="progressbar"
          >
            <span style={{ '--today-workload-progress': `${progressValue}%` } as CSSProperties} />
          </div>
        )}
        {presentation.warning ? <p className="today-workload__warning" role="status">{presentation.warning}</p> : null}
      </div>
    </header>
  );
}
