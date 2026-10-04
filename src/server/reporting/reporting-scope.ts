import {
  reportingCorrectionStateSchema,
  reportingProjectIdSchema,
  reportingTaskStateSchema,
  type ReportingQuery,
  type ReportingQueryResult,
  type ReportingSearchParams,
} from '../../schema/reporting';
import { derivePlanDate, getPlanDateBoundary, parsePlanDateKey } from '../today/plan-date';

const QUERY_KEYS = ['from', 'to', 'projectId', 'taskState', 'correctionState', 'page'] as const;

const calendarDay = (key: string, delta: number): string => {
  const date = new Date(parsePlanDateKey(key).date);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

const exceedsSixCalendarMonths = (from: string, to: string): boolean => {
  const start = parsePlanDateKey(from).date;
  const end = parsePlanDateKey(to).date;
  const limit = new Date(start);
  limit.setUTCDate(1);
  limit.setUTCMonth(limit.getUTCMonth() + 6);
  const destinationEnd = new Date(limit);
  destinationEnd.setUTCMonth(destinationEnd.getUTCMonth() + 1);
  destinationEnd.setUTCDate(0);
  limit.setUTCDate(Math.min(start.getUTCDate(), destinationEnd.getUTCDate()));
  return end >= limit;
};

const SIX_MONTH_ERROR = 'Select a range shorter than six calendar months.';

const localDayStart = (key: string, timezone: string): Date => {
  const candidate = getPlanDateBoundary(key, timezone).start;
  const reachesDate = (instant: number): boolean => derivePlanDate(new Date(instant), timezone).key >= key;
  const candidateTime = candidate.getTime();

  if (reachesDate(candidateTime) && !reachesDate(candidateTime - 1)) return candidate;

  // A midnight offset change can make the helper's wall-time conversion land in a gap.
  // Search instants around that candidate for the first occurrence of this local date.
  let before = candidateTime - 48 * 60 * 60 * 1000;
  let atOrAfter = candidateTime + 48 * 60 * 60 * 1000;
  while (atOrAfter - before > 1) {
    const middle = Math.floor((before + atOrAfter) / 2);
    if (reachesDate(middle)) atOrAfter = middle;
    else before = middle;
  }

  return new Date(atOrAfter);
};

const rawValues = (
  searchParams: ReportingSearchParams
): { values: Record<string, string>; errors: Record<string, string> } => {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const key of QUERY_KEYS) {
    const entries = searchParams instanceof URLSearchParams ? searchParams.getAll(key) : searchParams[key];
    const items = Array.isArray(entries) ? entries : entries === undefined ? [] : [entries];
    if (items.length > 0) values[key] = items[0];
    if (items.length > 1) errors[key] = 'Use only one value.';
  }

  return { values, errors };
};

export const parseReportingQuery = ({
  searchParams,
  mode,
  now,
  timezone,
}: {
  searchParams: ReportingSearchParams;
  mode: 'insights' | 'reports';
  now: Date;
  timezone: string;
}): ReportingQueryResult => {
  const { values, errors } = rawValues(searchParams);
  const hasFrom = values.from !== undefined;
  const hasTo = values.to !== undefined;

  if (!hasFrom && !hasTo) {
    const today = derivePlanDate(now, timezone).key;
    values.from = calendarDay(today, -27);
    values.to = today;
  } else if (hasFrom !== hasTo) {
    errors[hasFrom ? 'to' : 'from'] = 'Enter both start and end dates.';
  }

  for (const key of ['from', 'to'] as const) {
    if (values[key] === undefined) continue;
    try {
      parsePlanDateKey(values[key]);
    } catch {
      errors[key] = 'Enter a real date in YYYY-MM-DD format.';
    }
  }

  if (!errors.from && !errors.to && values.from > values.to) {
    errors.to = 'End date must be on or after start date.';
  }
  if (!errors.from && !errors.to && exceedsSixCalendarMonths(values.from, values.to)) {
    errors.to = SIX_MONTH_ERROR;
  }

  values.projectId ??= '';
  values.taskState ??= 'ALL';
  values.correctionState ??= 'ALL';
  values.page ??= '1';

  if (values.projectId && !reportingProjectIdSchema.safeParse(values.projectId).success) {
    errors.projectId = 'Select a valid project.';
  }
  const taskState = reportingTaskStateSchema.safeParse(values.taskState);
  if (!taskState.success) errors.taskState = 'Select a valid task state.';
  const correctionState = reportingCorrectionStateSchema.safeParse(values.correctionState);
  if (!correctionState.success) errors.correctionState = 'Select a valid correction state.';
  const page = Number(values.page);
  if (!/^[1-9]\d*$/.test(values.page) || !Number.isSafeInteger(page)) {
    errors.page = 'Enter a positive page number.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, values, errors };

  return {
    ok: true,
    query: {
      from: values.from,
      to: values.to,
      projectId: values.projectId || null,
      taskState: mode === 'insights' ? 'ALL' : taskState.data!,
      correctionState: mode === 'insights' ? 'ALL' : correctionState.data!,
      page: mode === 'insights' ? 1 : page,
    },
  };
};

export const resolveReportingBoundary = (
  query: ReportingQuery,
  timezone: string
): {
  start: Date;
  end: Date;
  dayKeys: string[];
} => {
  const from = parsePlanDateKey(query.from).key;
  const to = parsePlanDateKey(query.to).key;
  if (from > to) throw new RangeError('End date must be on or after start date.');
  if (exceedsSixCalendarMonths(from, to)) throw new RangeError(SIX_MONTH_ERROR);

  const dayKeys: string[] = [];
  for (let key = from; ; key = calendarDay(key, 1)) {
    dayKeys.push(key);
    if (key === to) break;
  }

  return {
    start: localDayStart(from, timezone),
    end: to === '9999-12-31' ? getPlanDateBoundary(to, timezone).end : localDayStart(calendarDay(to, 1), timezone),
    dayKeys,
  };
};
