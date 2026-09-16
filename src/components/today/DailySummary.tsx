import type { ReactNode } from 'react';

import type { TodaySummary, TodayWorkload } from '@/server/today/today-types';

import { formatTodayMinutes } from './TodayHeader';

export type DailySummaryProps = {
  summary: TodaySummary;
  workload: TodayWorkload;
};

export function DailySummary({ summary, workload }: DailySummaryProps): ReactNode {
  return (
    <section aria-labelledby="daily-summary-heading" className="today-daily-summary">
      <h2 id="daily-summary-heading">Day summary</h2>
      <dl>
        <div><dt>Planned</dt><dd>{formatTodayMinutes(workload.plannedMinutes)}</dd></div>
        <div><dt>Actual</dt><dd>{formatTodayMinutes(Math.floor(summary.actualSeconds / 60))} actual</dd></div>
        <div><dt>Completed</dt><dd>{summary.completedCount} completed</dd></div>
        <div><dt>Open</dt><dd>{summary.openCount} open</dd></div>
      </dl>
    </section>
  );
}
