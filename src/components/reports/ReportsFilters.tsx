import type { ReportingQuery } from '@/schema/reporting';

type Project = { id: string; name: string; archived: boolean };
export type ReportsFiltersProps = {
  query?: ReportingQuery;
  values?: Record<string, string>;
  ownedProjects: Project[];
  errors?: Record<string, string>;
};

const taskStates = [
  ['ALL', 'All states'],
  ['READY', 'Ready'],
  ['IN_PROGRESS', 'In progress'],
  ['PAUSED', 'Paused'],
  ['COMPLETED', 'Completed'],
  ['CANCELLED', 'Cancelled'],
];
const correctionStates = [
  ['ALL', 'All'],
  ['CORRECTED', 'Corrected'],
  ['UNCORRECTED', 'Uncorrected'],
];

export function ReportsFilters({ query, values, ownedProjects, errors = {} }: ReportsFiltersProps) {
  const selected = {
    from: values?.from ?? query?.from ?? '',
    to: values?.to ?? query?.to ?? '',
    projectId: values?.projectId ?? query?.projectId ?? '',
    taskState: values?.taskState ?? query?.taskState ?? 'ALL',
    correctionState: values?.correctionState ?? query?.correctionState ?? 'ALL',
  };
  const field = (name: keyof typeof selected, label: string, choices?: string[][]) => {
    const error = errors[name];
    const id = `reports-${name}`;
    return (
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        {choices ? (
          <select
            id={id}
            name={name}
            defaultValue={selected[name]}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="min-h-11 w-full rounded-md border border-border-input bg-input-bg px-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
          >
            {choices.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
            {selected[name] && !choices.some(([value]) => value === selected[name]) && (
              <option value={selected[name]}>Unavailable selection</option>
            )}
          </select>
        ) : (
          <input
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            placeholder="YYYY-MM-DD"
            defaultValue={selected[name]}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="min-h-11 w-full rounded-md border border-border-input bg-input-bg px-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
          />
        )}
        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-text-danger">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <form
      action="/reports"
      method="get"
      aria-label="Report filters"
      className="rounded-xl border border-border bg-surface p-4 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {field('from', 'From')}
        {field('to', 'To')}
        {field('projectId', 'Project', [
          ['', 'All projects'],
          ...ownedProjects.map((project) => [project.id, `${project.name}${project.archived ? ' (archived)' : ''}`]),
        ])}
        {field('taskState', 'Current task state', taskStates)}
        {field('correctionState', 'Session correction state', correctionStates)}
        <button
          type="submit"
          className="min-h-11 self-end rounded-md bg-brand-bold px-4 font-medium text-text-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
        >
          Apply filters
        </button>
      </div>
      {errors.page && (
        <div className="mt-4 grid max-w-xs gap-1.5">
          <label htmlFor="reports-page" className="text-sm font-medium text-text">
            Page
          </label>
          <input
            id="reports-page"
            name="page"
            type="text"
            inputMode="numeric"
            defaultValue={values?.page ?? String(query?.page ?? '')}
            aria-invalid="true"
            aria-describedby="reports-page-error"
            className="min-h-11 w-full rounded-md border border-border-input bg-input-bg px-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
          />
          <p id="reports-page-error" role="alert" className="text-sm text-text-danger">
            {errors.page}
          </p>
        </div>
      )}
      <p className="mt-3 text-sm text-text-subtle">
        Dates use your saved time zone. Applying filters updates the address and preview.
      </p>
    </form>
  );
}
