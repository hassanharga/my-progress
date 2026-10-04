import Link from 'next/link';
import type { ReportingQuery } from '@/schema/reporting';
import type { ReportingSnapshot } from '@/server/reporting/read-reporting';
import type { ReportingDailyRow, ReportingWeeklyRow } from '@/server/reporting/reporting-types';

import { InsightsScopeForm } from './InsightsScopeForm';

type Project = ReportingSnapshot['ownedProjects'][number];
type Props =
  | {
      snapshot: ReportingSnapshot;
      query?: never;
      ownedProjects?: never;
      values?: never;
      errors?: never;
      readError?: never;
    }
  | {
      snapshot?: never;
      query?: ReportingQuery;
      ownedProjects: Project[];
      values?: Record<string, string>;
      errors?: Record<string, string>;
      readError?: boolean;
    };

const duration = (seconds: number, locale: string): string => {
  const absolute = Math.round(Math.abs(seconds));
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  const remainder = absolute % 60;
  const number = new Intl.NumberFormat(locale);
  return `${seconds < 0 ? '−' : ''}${number.format(hours)}h ${number.format(minutes)}m ${number.format(remainder)}s`;
};

const plannedDuration = (minutes: number, locale: string): string => duration(minutes * 60, locale);
const dateLabel = (key: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${key}T12:00:00Z`)
  );

const reportsHref = (query: ReportingQuery): string => {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.projectId) params.set('projectId', query.projectId);
  return `/reports?${params.toString()}`;
};

function Review({
  title,
  caption,
  rows,
  keyName,
  locale,
}: {
  title: string;
  caption: string;
  rows: Array<ReportingDailyRow | ReportingWeeklyRow>;
  keyName: 'date' | 'weekStart';
  locale: string;
}) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.plannedMinutes * 60, row.trackedSeconds)));
  return (
    <section aria-label={title} className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 className="font-heading text-xl font-semibold text-text">{title}</h2>
      <p className="mt-1 text-sm text-text-subtle">
        Bars compare planned time and tracked task time. The table gives exact values.
      </p>
      <div
        role="img"
        aria-label={`${title} bar chart; exact values follow in the table`}
        className="mt-5 space-y-2"
        aria-describedby={`${keyName}-table-caption`}
      >
        {rows.map((row) => {
          const key = keyName === 'date' ? (row as ReportingDailyRow).date : (row as ReportingWeeklyRow).weekStart;
          return (
            <div
              key={key}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 text-xs text-text-subtle"
            >
              <span>{dateLabel(key, locale)}</span>
              <div className="grid gap-1">
                <span
                  className="block h-2 rounded bg-neutral-subtle"
                  style={{ width: `${((row.plannedMinutes * 60) / max) * 100}%` }}
                />
                <span
                  className="block h-2 rounded bg-brand-bold"
                  style={{ width: `${(row.trackedSeconds / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 max-w-full overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm text-text">
          <caption id={`${keyName}-table-caption`} className="pb-2 text-left text-sm text-text-subtle">
            {caption}
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-3">
                {keyName === 'date' ? 'Date' : 'Week starting'}
              </th>
              <th scope="col" className="p-2">
                Planned
              </th>
              <th scope="col" className="p-2">
                Worked on planned tasks
              </th>
              <th scope="col" className="p-2">
                Variance
              </th>
              <th scope="col" className="p-2">
                Unplanned work
              </th>
              <th scope="col" className="p-2">
                Tracked task time
              </th>
              <th scope="col" className="p-2">
                Session splits or resumptions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = keyName === 'date' ? (row as ReportingDailyRow).date : (row as ReportingWeeklyRow).weekStart;
              return (
                <tr key={key} className="border-b border-border last:border-0">
                  <th scope="row" className="py-2 pr-3 font-medium">
                    {dateLabel(key, locale)}
                  </th>
                  <td className="p-2 tabular-nums">{plannedDuration(row.plannedMinutes, locale)}</td>
                  <td className="p-2 tabular-nums">{duration(row.plannedTaskSeconds, locale)}</td>
                  <td className="p-2 tabular-nums">{duration(row.varianceSeconds, locale)}</td>
                  <td className="p-2 tabular-nums">{duration(row.unplannedSeconds, locale)}</td>
                  <td className="p-2 tabular-nums">{duration(row.trackedSeconds, locale)}</td>
                  <td className="p-2 tabular-nums">{row.sessionSplitCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function InsightsView(props: Props) {
  const snapshot = props.snapshot;
  const query = snapshot?.query ?? props.query;
  const projects = snapshot?.ownedProjects ?? props.ownedProjects ?? [];
  const locale = 'en';
  const facts = snapshot?.facts;
  const hasActivity = Boolean(
    facts && (facts.plannedMinutes || facts.missingEstimateCount || facts.trackedSeconds || snapshot?.taskRows.length)
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12 text-text">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-subtle">Working ledger</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Insights</h1>
          <p className="mt-2 max-w-2xl text-text-subtle">
            See how your plan compares with tracked work across your projects.
          </p>
        </div>
        {query && (
          <Link
            href={reportsHref(query)}
            className="rounded-md border border-border px-4 py-2 font-medium text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
          >
            Open Reports
          </Link>
        )}
      </header>

      <InsightsScopeForm query={query} values={props.values} ownedProjects={projects} errors={props.errors} />

      {props.readError && (
        <div role="alert" className="rounded-xl border border-border-danger bg-danger-subtler p-4 text-text-danger">
          Insights could not be loaded. Your selected scope is still in the address. Try applying it again.
        </div>
      )}

      {snapshot && (
        <>
          <p className="text-sm text-text-subtle">
            {dateLabel(query!.from, locale)} to {dateLabel(query!.to, locale)} ·{' '}
            {query!.projectId ? projects.find((project) => project.id === query!.projectId)?.name : 'All projects'} ·{' '}
            {snapshot.timezone}. Figures reflect the current saved plan and work recorded by{' '}
            {new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: snapshot.timezone,
            }).format(snapshot.generatedAt)}
            .
          </p>
          <section aria-labelledby="insights-summary" className="rounded-xl border border-border bg-surface p-4 sm:p-6">
            <h2 id="insights-summary" className="font-heading text-xl font-semibold">
              Plan and work
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Planned', plannedDuration(facts!.plannedMinutes, locale)],
                ['Worked on planned tasks', duration(facts!.plannedTaskSeconds, locale)],
                ['Variance', duration(facts!.varianceSeconds, locale)],
                ['Unplanned work', duration(facts!.unplannedSeconds, locale)],
                ['Tracked task time', duration(facts!.trackedSeconds, locale)],
                ['Unique working time', duration(facts!.uniqueWorkingSeconds, locale)],
                ['Overlapping tracked time', duration(facts!.overlapSeconds, locale)],
                [
                  'Without an estimate',
                  new Intl.NumberFormat(locale).format(facts!.missingEstimateCount) + ' plan items',
                ],
                ['Worked on unestimated planned tasks', duration(facts!.missingEstimateWorkedSeconds, locale)],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-border pt-3">
                  <dt className="text-sm text-text-subtle">{label}</dt>
                  <dd className="mt-1 font-mono text-xl font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-text-subtle">
              Variance is worked time on estimated planned tasks minus their planned time. A missing estimate is not
              zero. Tracked task time adds all matching sessions; unique working time counts overlapping sessions once.
              Overlapping tracked time is the difference.
            </p>
          </section>

          {!hasActivity && (
            <section className="rounded-xl border border-border bg-surface p-6" aria-labelledby="insights-empty">
              <h2 id="insights-empty" className="font-heading text-xl font-semibold">
                No activity in this scope
              </h2>
              <p className="mt-2 text-text-subtle">
                No planned or tracked work matches this scope. Change the dates or project, or{' '}
                <Link className="underline" href="/dashboard">
                  go to Today
                </Link>{' '}
                to plan your work.
              </p>
            </section>
          )}

          {hasActivity && (
            <>
              <Review
                title="Daily review"
                caption="Daily plan and work, with exact durations"
                rows={facts!.daily}
                keyName="date"
                locale={locale}
              />
              <Review
                title="Weekly review"
                caption="Weekly plan and work, with exact durations"
                rows={facts!.weekly}
                keyName="weekStart"
                locale={locale}
              />
              <section
                aria-labelledby="insights-allocation"
                className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-6"
              >
                <h2 id="insights-allocation" className="font-heading text-xl font-semibold">
                  Time allocation by project
                </h2>
                <p className="mt-1 text-sm text-text-subtle">
                  Tracked task time by project; concurrent sessions can overlap.
                </p>
                <div
                  role="img"
                  aria-label="Tracked task time by project bar chart; exact values follow in the table"
                  aria-describedby="allocation-caption"
                  className="mt-5 space-y-3"
                >
                  {facts!.projects.map((project) => (
                    <div
                      key={project.projectId}
                      className="grid grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)] items-center gap-3 text-sm"
                    >
                      <span className="truncate">{project.projectName}</span>
                      <span
                        className="block h-3 rounded bg-brand-bold"
                        style={{
                          width: `${(project.trackedSeconds / Math.max(1, ...facts!.projects.map((item) => item.trackedSeconds))) * 100}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-5 max-w-full overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-left text-sm">
                    <caption id="allocation-caption" className="pb-2 text-left text-text-subtle">
                      Project allocation, with exact durations and session counts
                    </caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="py-2">
                          Project
                        </th>
                        <th scope="col" className="p-2">
                          Tracked task time
                        </th>
                        <th scope="col" className="p-2">
                          Sessions
                        </th>
                        <th scope="col" className="p-2">
                          Splits or resumptions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {facts!.projects.map((project) => (
                        <tr key={project.projectId} className="border-b border-border last:border-0">
                          <th scope="row" className="py-2 font-medium">
                            {project.projectName}
                          </th>
                          <td className="p-2 tabular-nums">{duration(project.trackedSeconds, locale)}</td>
                          <td className="p-2 tabular-nums">{project.sessionCount}</td>
                          <td className="p-2 tabular-nums">{project.sessionSplitCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section
                aria-labelledby="insights-patterns"
                className="rounded-xl border border-border bg-surface p-4 sm:p-6"
              >
                <h2 id="insights-patterns" className="font-heading text-xl font-semibold">
                  Session structure and overruns
                </h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-text-subtle">Session splits or resumptions</dt>
                    <dd className="font-mono text-xl tabular-nums">{facts!.sessionSplitCount}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-text-subtle">Estimated planned items that overran</dt>
                    <dd className="font-mono text-xl tabular-nums">{facts!.overrunCount}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-text-subtle">
                  A split records separate sessions. It does not explain why work paused. An overrun means tracked time
                  exceeded a planned estimate.
                </p>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
