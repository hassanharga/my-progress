import Link from 'next/link';
import type { ReportingQuery } from '@/schema/reporting';
import type { ReportingSnapshot } from '@/server/reporting/read-reporting';

import { paginateReportTasks, reportScopeParams } from './reporting-page';
import { ReportsFilters } from './ReportsFilters';

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

const duration = (seconds: number) => {
  const whole = Math.round(Math.abs(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = whole % 60;
  return `${seconds < 0 ? '−' : ''}${hours}h ${minutes}m ${remainder}s`;
};
const dateLabel = (key: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`));
const instantLabel = (instant: Date, timezone: string) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(instant);
const stateLabel = (state: string) =>
  ({
    READY: 'Ready',
    IN_PROGRESS: 'In progress',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    ALL: 'All states',
  })[state as 'READY'] ?? state;
const correctionLabel = (state: string) =>
  ({ ALL: 'All', CORRECTED: 'Corrected', UNCORRECTED: 'Uncorrected' })[state as 'ALL'] ?? state;

export function ReportsView(props: Props) {
  const snapshot = props.snapshot;
  const query = snapshot?.query ?? props.query;
  const projects = snapshot?.ownedProjects ?? props.ownedProjects ?? [];
  const preview = snapshot && paginateReportTasks(snapshot.taskRows, snapshot.query.page);
  const scope = query && reportScopeParams(query);
  const exportHref = scope && `/reports/export?${scope.toString()}`;
  const pageHref = (page: number) => {
    const params = reportScopeParams(query!);
    params.set('page', String(page));
    return `/reports?${params.toString()}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 pb-12 text-text">
      <header>
        <p className="text-sm font-medium text-text-subtle">Working ledger</p>
        <h1 tabIndex={-1} className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Reports
        </h1>
        <p className="mt-2 max-w-2xl text-text-subtle">
          Review the records in your selected scope, then download the same scope as Excel.
        </p>
      </header>

      <ReportsFilters query={query} values={props.values} ownedProjects={projects} errors={props.errors} />
      {props.errors && Object.keys(props.errors).length > 0 && (
        <p role="alert" className="text-sm text-text-danger">
          Correct the marked filters before downloading.
        </p>
      )}
      {props.readError && (
        <div role="alert" className="rounded-xl border border-border-danger bg-danger-subtler p-4 text-text-danger">
          Reports could not be loaded. Your selected filters remain in the address. Apply them again to retry.
        </div>
      )}

      {snapshot && preview && (
        <>
          <section aria-labelledby="reports-scope" className="rounded-xl border border-border bg-surface p-4 sm:p-6">
            <h2 id="reports-scope" className="font-heading text-xl font-semibold">
              Active scope
            </h2>
            <p className="mt-2 text-text-subtle">
              {dateLabel(query!.from)} to {dateLabel(query!.to)} ·{' '}
              {query!.projectId ? projects.find((project) => project.id === query!.projectId)?.name : 'All projects'} ·
              Current task state: {stateLabel(query!.taskState)} · Session correction state:{' '}
              {correctionLabel(query!.correctionState)} · {snapshot.timezone}
            </p>
            <p className="mt-1 text-sm text-text-subtle">
              Captured {instantLabel(snapshot.generatedAt, snapshot.timezone)}. Task state is current; dates use your
              saved time zone.
            </p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                ['Tracked task time', duration(snapshot.facts.trackedSeconds)],
                ['Unique working time', duration(snapshot.facts.uniqueWorkingSeconds)],
                ['Overlapping tracked time', duration(snapshot.facts.overlapSeconds)],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-border pt-3">
                  <dt className="text-sm text-text-subtle">{label}</dt>
                  <dd className="mt-1 font-mono text-xl font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-text-subtle">
              Tracked task time adds matching sessions. Unique working time counts overlapping sessions once;
              overlapping tracked time is their difference. Task preview pages do not change these totals.
            </p>
          </section>

          <section
            aria-labelledby="reports-tasks"
            className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="reports-tasks" className="font-heading text-xl font-semibold">
                Task preview
              </h2>
              <p className="text-sm text-text-subtle">
                {preview.total} matching tasks · Page {preview.page} of {preview.pageCount}
              </p>
            </div>
            {preview.total === 0 ? (
              <p className="mt-3 text-text-subtle">
                No planned or tracked tasks match these filters. Change the dates or filters, or{' '}
                <Link href="/dashboard" className="underline">
                  go to Today
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 max-w-full overflow-x-auto">
                <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
                  <caption className="pb-2 text-left text-text-subtle">
                    Matching tasks on this preview page; totals above cover all matching tasks
                  </caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="py-2 pr-3">
                        Project
                      </th>
                      <th scope="col" className="p-2">
                        Task
                      </th>
                      <th scope="col" className="p-2">
                        Current task state
                      </th>
                      <th scope="col" className="p-2">
                        Planned
                      </th>
                      <th scope="col" className="p-2">
                        Tracked task time
                      </th>
                      <th scope="col" className="p-2">
                        Sessions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <th scope="row" className="py-2 pr-3 font-medium">
                          {row.projectName}
                        </th>
                        <td className="p-2">{row.title}</td>
                        <td className="p-2">{stateLabel(row.status)}</td>
                        <td className="p-2 tabular-nums">
                          {row.plannedMinutes
                            ? duration(row.plannedMinutes * 60)
                            : row.missingEstimateCount
                              ? 'No estimate'
                              : '—'}
                          {row.missingEstimateCount > 0 && row.plannedMinutes > 0
                            ? ` · ${row.missingEstimateCount} without estimate`
                            : ''}
                        </td>
                        <td className="p-2 tabular-nums">{duration(row.trackedSeconds)}</td>
                        <td className="p-2 tabular-nums">{row.sessionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {preview.pageCount > 1 && (
              <nav aria-label="Task preview pages" className="mt-4 flex gap-3 text-sm">
                {preview.page > 1 && (
                  <Link
                    href={pageHref(preview.page - 1)}
                    className="min-h-11 rounded-md border border-border px-4 py-3 focus-visible:outline-2 focus-visible:outline-border-focused"
                  >
                    Previous page
                  </Link>
                )}
                {preview.page < preview.pageCount && (
                  <Link
                    href={pageHref(preview.page + 1)}
                    className="min-h-11 rounded-md border border-border px-4 py-3 focus-visible:outline-2 focus-visible:outline-border-focused"
                  >
                    Next page
                  </Link>
                )}
              </nav>
            )}
          </section>

          <section
            aria-labelledby="reports-sessions"
            className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-6"
          >
            <h2 id="reports-sessions" className="font-heading text-xl font-semibold">
              Session details
            </h2>
            <p className="mt-1 text-sm text-text-subtle">
              {snapshot.sessionRows.length} matching sessions across the full selected scope, including tasks outside
              this preview page. Times and durations are clipped to the date range.
            </p>
            {snapshot.sessionRows.length === 0 ? (
              <p className="mt-3 text-text-subtle">No sessions match these filters.</p>
            ) : (
              <div className="mt-4 max-w-full overflow-x-auto">
                <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                  <caption className="pb-2 text-left text-text-subtle">
                    All matching session details for this report scope
                  </caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="py-2 pr-3">
                        Project
                      </th>
                      <th scope="col" className="p-2">
                        Task
                      </th>
                      <th scope="col" className="p-2">
                        Scoped start
                      </th>
                      <th scope="col" className="p-2">
                        Scoped end
                      </th>
                      <th scope="col" className="p-2">
                        Scoped duration
                      </th>
                      <th scope="col" className="p-2">
                        Correction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.sessionRows.map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <th scope="row" className="py-2 pr-3 font-medium">
                          {row.projectName}
                        </th>
                        <td className="p-2">{row.taskTitle}</td>
                        <td className="p-2">{instantLabel(row.scopedStartedAt, snapshot.timezone)}</td>
                        <td className="p-2">{instantLabel(row.scopedEndedAt, snapshot.timezone)}</td>
                        <td className="p-2 tabular-nums">{duration(row.scopedSeconds)}</td>
                        <td className="p-2">{row.correctedAt ? 'Corrected' : 'Uncorrected'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <div>
            {exportHref && (
              <Link
                href={exportHref}
                className="inline-flex min-h-11 items-center rounded-md bg-brand-bold px-4 font-medium text-text-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
              >
                Download Excel for this scope
              </Link>
            )}
          </div>
        </>
      )}
      {!snapshot && (
        <p aria-disabled="true" className="text-sm text-text-subtle">
          Download Excel is unavailable until the filters resolve.
        </p>
      )}
    </div>
  );
}
