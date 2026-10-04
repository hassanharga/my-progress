import type { ReportingQuery } from '@/schema/reporting';

type Project = { id: string; name: string; archived: boolean };

export type InsightsScopeFormProps = {
  query?: ReportingQuery;
  values?: Record<string, string>;
  ownedProjects: Project[];
  errors?: Record<string, string>;
};

export function InsightsScopeForm({ query, values, ownedProjects, errors = {} }: InsightsScopeFormProps) {
  const from = values?.from ?? query?.from ?? '';
  const to = values?.to ?? query?.to ?? '';
  const projectId = values?.projectId ?? query?.projectId ?? '';

  return (
    <form
      action="/insights"
      method="get"
      aria-label="Insights scope"
      className="rounded-xl border border-border bg-surface p-4 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto] lg:items-end">
        <div className="grid gap-1.5">
          <label htmlFor="insights-from" className="text-sm font-medium text-text">
            From
          </label>
          <input
            id="insights-from"
            name="from"
            type="text"
            inputMode="numeric"
            placeholder="YYYY-MM-DD"
            defaultValue={from}
            aria-invalid={errors.from ? true : undefined}
            aria-describedby={errors.from ? 'insights-from-error' : undefined}
            className="min-h-11 w-full rounded-md border border-border-input bg-input-bg px-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
          />
          {errors.from && (
            <p id="insights-from-error" role="alert" className="text-sm text-text-danger">
              {errors.from}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="insights-to" className="text-sm font-medium text-text">
            To
          </label>
          <input
            id="insights-to"
            name="to"
            type="text"
            inputMode="numeric"
            placeholder="YYYY-MM-DD"
            defaultValue={to}
            aria-invalid={errors.to ? true : undefined}
            aria-describedby={errors.to ? 'insights-to-error' : undefined}
            className="min-h-11 w-full rounded-md border border-border-input bg-input-bg px-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
          />
          {errors.to && (
            <p id="insights-to-error" role="alert" className="text-sm text-text-danger">
              {errors.to}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="insights-project" className="text-sm font-medium text-text">
            Project
          </label>
          <select
            id="insights-project"
            name="projectId"
            defaultValue={projectId}
            aria-invalid={errors.projectId ? true : undefined}
            aria-describedby={errors.projectId ? 'insights-project-error' : undefined}
            className="min-h-11 w-full rounded-md border border-border-input bg-input-bg px-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
          >
            <option value="">All projects</option>
            {ownedProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
                {project.archived ? ' (archived)' : ''}
              </option>
            ))}
            {projectId && !ownedProjects.some((project) => project.id === projectId) && (
              <option value={projectId}>Unavailable selection</option>
            )}
          </select>
          {errors.projectId && (
            <p id="insights-project-error" role="alert" className="text-sm text-text-danger">
              {errors.projectId}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-md bg-brand-bold px-4 font-medium text-text-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focused"
        >
          Apply scope
        </button>
      </div>
      <p className="mt-3 text-sm text-text-subtle">
        Dates use your saved time zone. Applying a scope updates this page and its address.
      </p>
    </form>
  );
}
