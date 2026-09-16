import type { ExecutionState } from '../tasks/task-transition-types';

export type TodayProjectIdentity = {
  id: string;
  name: string;
};

export type TodayPlanOutcome = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export type TodayTaskSummary = {
  actualSeconds: number;
  createdAt: string;
  currentNextStep: string | null;
  openSessionStartedAt: string | null;
  project: TodayProjectIdentity;
  status: ExecutionState;
  taskId: string;
  title: string;
};

export type TodayPlanItem = TodayTaskSummary & {
  id: string;
  outcome: TodayPlanOutcome;
  plannedMinutes: number | null;
  position: number;
};

export type TodayBacklogItem = TodayTaskSummary & {
  defaultPlannedMinutes: number | null;
};

export type TodayCarryoverItem = TodayTaskSummary & {
  id: string;
  plannedMinutes: number | null;
  position: number;
  sourcePlanDate: string;
};

export type TodayRunningIndicator = {
  elapsedSeconds: number;
  project: TodayProjectIdentity;
  sessionId: string;
  startedAt: string;
  taskId: string;
  title: string;
};

export type TodayFocusItem = TodayTaskSummary & {
  planItemId: string | null;
  plannedMinutes: number | null;
  source: 'planned' | 'running';
};

export type TodayWorkloadState = 'unset' | 'under' | 'near' | 'over';

export type TodayWorkload = {
  actualSeconds: number;
  capacityMinutes: number | null;
  plannedMinutes: number;
  remainingMinutes: number | null;
  state: TodayWorkloadState;
  utilizationPercent: number | null;
};

export type TodaySummary = {
  actualSeconds: number;
  cancelledCount: number;
  completedCount: number;
  openCount: number;
  totalCount: number;
};

export type TodayViewModel = {
  backlog: TodayBacklogItem[];
  carryover: TodayCarryoverItem[];
  focus: TodayFocusItem | null;
  generatedAt: string;
  items: TodayPlanItem[];
  planDate: string;
  projects: TodayProjectIdentity[];
  revision: number;
  runningIndicators: TodayRunningIndicator[];
  summary: TodaySummary;
  timezone: string;
  workload: TodayWorkload;
};
