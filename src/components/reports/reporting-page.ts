import type { ReportingQuery } from '@/schema/reporting';
import type { ReportingTaskRow } from '@/server/reporting/read-reporting';

export const REPORT_PAGE_SIZE = 25;

export function reportScopeParams(query: ReportingQuery): URLSearchParams {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.projectId) params.set('projectId', query.projectId);
  params.set('taskState', query.taskState);
  params.set('correctionState', query.correctionState);
  return params;
}

export function paginateReportTasks(rows: ReportingTaskRow[], page: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / REPORT_PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  return {
    rows: rows.slice((visiblePage - 1) * REPORT_PAGE_SIZE, visiblePage * REPORT_PAGE_SIZE),
    page: visiblePage,
    pageCount,
    total: rows.length,
  };
}
