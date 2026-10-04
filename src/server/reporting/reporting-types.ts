import type { ReportingQuery } from '../../schema/reporting';
import type { WeekStartDay } from '../../utils/time-stats';
import type { ExecutionState } from '../tasks/task-transition-types';

export type ReportingSource = {
  projects: Array<{ id: string; name: string }>;
  tasks: Array<{ id: string; projectId: string; title: string; status: ExecutionState }>;
  plans: Array<{ taskId: string; projectId: string; planDate: Date; plannedMinutes: number | null }>;
  sessions: Array<{
    id: string;
    taskId: string;
    projectId: string;
    startedAt: Date;
    endedAt: Date | null;
    correctedAt: Date | null;
  }>;
};

export type ReportingMetricTotals = {
  plannedMinutes: number;
  missingEstimateCount: number;
  plannedTaskSeconds: number;
  missingEstimateWorkedSeconds: number;
  unplannedSeconds: number;
  trackedSeconds: number;
  uniqueWorkingSeconds: number;
  overlapSeconds: number;
  varianceSeconds: number;
  overrunCount: number;
  sessionSplitCount: number;
};

export type ReportingDailyRow = ReportingMetricTotals & { date: string };
export type ReportingWeeklyRow = ReportingMetricTotals & { weekStart: string };
export type ReportingProjectRow = {
  projectId: string;
  projectName: string;
  trackedSeconds: number;
  uniqueWorkingSeconds: number;
  sessionCount: number;
  sessionSplitCount: number;
};

export type ReportingFacts = ReportingMetricTotals & {
  daily: ReportingDailyRow[];
  weekly: ReportingWeeklyRow[];
  projects: ReportingProjectRow[];
};

export type CalculateReportingFactsInput = {
  source: ReportingSource;
  query: ReportingQuery;
  timezone: string;
  weekStartDay: WeekStartDay;
  now: Date;
};
