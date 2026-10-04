import { WEEK_STARTS_ON } from '../../utils/time-stats';
import { clipSessionInterval, summarizeSessionIntervals } from '../stats/session-intervals';
import { derivePlanDate } from '../today/plan-date';
import { resolveReportingBoundary } from './reporting-scope';
import type {
  CalculateReportingFactsInput,
  ReportingDailyRow,
  ReportingFacts,
  ReportingMetricTotals,
  ReportingProjectRow,
  ReportingSource,
  ReportingWeeklyRow,
} from './reporting-types';

const emptyTotals = (): ReportingMetricTotals => ({
  plannedMinutes: 0,
  missingEstimateCount: 0,
  plannedTaskSeconds: 0,
  missingEstimateWorkedSeconds: 0,
  unplannedSeconds: 0,
  trackedSeconds: 0,
  uniqueWorkingSeconds: 0,
  overlapSeconds: 0,
  varianceSeconds: 0,
  overrunCount: 0,
  sessionSplitCount: 0,
});

const totalKeys: (keyof ReportingMetricTotals)[] = [
  'plannedMinutes',
  'missingEstimateCount',
  'plannedTaskSeconds',
  'missingEstimateWorkedSeconds',
  'unplannedSeconds',
  'trackedSeconds',
  'uniqueWorkingSeconds',
  'overlapSeconds',
  'varianceSeconds',
  'overrunCount',
  'sessionSplitCount',
];

const addTotals = (target: ReportingMetricTotals, source: ReportingMetricTotals): void => {
  for (const key of totalKeys) target[key] += source[key];
};

const weekStartKey = (dateKey: string, weekStartDay: CalculateReportingFactsInput['weekStartDay']): string => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const offset = (date.getUTCDay() - WEEK_STARTS_ON[weekStartDay] + 7) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
};

const planKey = (plan: ReportingSource['plans'][number]): string => `${plan.projectId}\u0000${plan.taskId}`;
const sessionTaskKey = (session: ReportingSource['sessions'][number]): string =>
  `${session.projectId}\u0000${session.taskId}`;

export const calculateReportingFacts = ({
  source,
  query,
  timezone,
  weekStartDay,
  now,
}: CalculateReportingFactsInput): ReportingFacts => {
  const boundary = resolveReportingBoundary(query, timezone);
  const periodBoundary = { start: boundary.start, end: boundary.end, now };
  const periodSessions = source.sessions.filter((session) => clipSessionInterval(session, periodBoundary) !== null);
  const projectRows = new Map<string, ReportingProjectRow>();
  for (const project of source.projects) {
    projectRows.set(project.id, {
      projectId: project.id,
      projectName: project.name,
      trackedSeconds: 0,
      uniqueWorkingSeconds: 0,
      sessionCount: 0,
      sessionSplitCount: 0,
    });
  }

  const sessionsByTask = new Map<string, ReportingSource['sessions']>();
  for (const session of periodSessions) {
    const key = sessionTaskKey(session);
    const sessions = sessionsByTask.get(key) ?? [];
    if (!sessions.some((item) => item.id === session.id)) sessions.push(session);
    sessionsByTask.set(key, sessions);
  }
  const splitsByDate = new Map<string, number>();
  for (const sessions of sessionsByTask.values()) {
    sessions.sort(
      (left, right) => left.startedAt.getTime() - right.startedAt.getTime() || left.id.localeCompare(right.id)
    );
    for (const session of sessions.slice(1)) {
      const startDate = derivePlanDate(session.startedAt, timezone).key;
      const date = startDate < query.from ? query.from : startDate;
      splitsByDate.set(date, (splitsByDate.get(date) ?? 0) + 1);
      const project = projectRows.get(session.projectId);
      if (project) project.sessionSplitCount += 1;
    }
  }

  const daily: ReportingDailyRow[] = [];
  for (const date of boundary.dayKeys) {
    const dayBoundary = resolveReportingBoundary({ ...query, from: date, to: date }, timezone);
    const intervalBoundary = { start: dayBoundary.start, end: dayBoundary.end, now };
    const daySessions = periodSessions.filter((session) => clipSessionInterval(session, intervalBoundary) !== null);
    const dayPlans = source.plans.filter((plan) => plan.planDate.toISOString().slice(0, 10) === date);
    const plannedTasks = new Map(dayPlans.map((plan) => [planKey(plan), plan]));
    const totals = emptyTotals();
    totals.sessionSplitCount = splitsByDate.get(date) ?? 0;
    const intervalTotals = summarizeSessionIntervals(daySessions, intervalBoundary);
    totals.trackedSeconds = intervalTotals.trackedSeconds;
    totals.uniqueWorkingSeconds = intervalTotals.uniqueWorkingSeconds;
    totals.overlapSeconds = totals.trackedSeconds - totals.uniqueWorkingSeconds;

    const taskSeconds = new Map<string, number>();
    for (const session of daySessions) {
      const clipped = clipSessionInterval(session, intervalBoundary)!;
      const seconds = (clipped.end.getTime() - clipped.start.getTime()) / 1000;
      const key = sessionTaskKey(session);
      taskSeconds.set(key, (taskSeconds.get(key) ?? 0) + seconds);
      const project = projectRows.get(session.projectId);
      if (project) project.trackedSeconds += seconds;
    }

    for (const plan of dayPlans) {
      if (plan.plannedMinutes === null) totals.missingEstimateCount += 1;
      else totals.plannedMinutes += plan.plannedMinutes;
    }
    for (const [key, seconds] of taskSeconds) {
      const plan = plannedTasks.get(key);
      if (!plan) totals.unplannedSeconds += seconds;
      else if (plan.plannedMinutes === null) totals.missingEstimateWorkedSeconds += seconds;
      else totals.plannedTaskSeconds += seconds;
    }
    for (const plan of dayPlans) {
      if (plan.plannedMinutes !== null && (taskSeconds.get(planKey(plan)) ?? 0) > plan.plannedMinutes * 60) {
        totals.overrunCount += 1;
      }
    }
    totals.varianceSeconds = totals.plannedTaskSeconds - totals.plannedMinutes * 60;
    daily.push({ date, ...totals });
  }

  const weeklyMap = new Map<string, ReportingWeeklyRow>();
  const totals = emptyTotals();
  for (const day of daily) {
    addTotals(totals, day);
    const weekStart = weekStartKey(day.date, weekStartDay);
    let week = weeklyMap.get(weekStart);
    if (!week) {
      week = { weekStart, ...emptyTotals() };
      weeklyMap.set(weekStart, week);
    }
    addTotals(week, day);
  }

  const projects = [...projectRows.values()].sort(
    (left, right) => left.projectName.localeCompare(right.projectName) || left.projectId.localeCompare(right.projectId)
  );
  for (const project of projects) {
    const sessions = periodSessions.filter((session) => session.projectId === project.projectId);
    project.uniqueWorkingSeconds = summarizeSessionIntervals(sessions, periodBoundary).uniqueWorkingSeconds;
    project.sessionCount = sessions.length;
  }

  return { ...totals, daily, weekly: [...weeklyMap.values()], projects };
};
