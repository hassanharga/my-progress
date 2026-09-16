import type { Prisma, PrismaClient } from '../../../generated/prisma/client';
import { summarizeSessionIntervals } from '../stats/session-intervals';
import { normalizeExecutionState } from '../tasks/task-queries';
import { derivePlanDate, getPlanDateBoundary, parsePlanDateKey, type PlanDateBoundary } from './plan-date';
import type {
  TodayBacklogItem,
  TodayCarryoverItem,
  TodayFocusItem,
  TodayPlanItem,
  TodayRunningIndicator,
  TodayTaskSummary,
  TodayViewModel,
  TodayWorkload,
} from './today-types';

type TodayQueryClient = PrismaClient | Prisma.TransactionClient;

type ReadTodayOptions = {
  clock?: () => Date;
  ownerId: string;
  planDate?: string;
  prisma: TodayQueryClient;
};

type Session = {
  endedAt: Date | null;
  startedAt: Date;
};

const ACTIVE_PLAN_OUTCOMES = ['OPEN', 'COMPLETED', 'CANCELLED'] as const;
const TERMINAL_TASK_STATUSES = ['COMPLETED', 'CANCELLED'] as const;
const NEAR_CAPACITY_RATIO = 0.8;

const sessionSeconds = (session: Session, now: Date): number => {
  const endedAt = session.endedAt ?? now;
  return Math.max(0, endedAt.getTime() - session.startedAt.getTime()) / 1000;
};

const openSessionStartedAt = (sessions: Session[]): string | null => {
  const openSession = sessions
    .filter((session) => session.endedAt === null)
    .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())[0];
  return openSession?.startedAt.toISOString() ?? null;
};

const toTaskSummary = (
  task: {
    createdAt: Date;
    currentNextStep: string | null;
    id: string;
    loggedTime: Session[];
    status: Parameters<typeof normalizeExecutionState>[0];
    title: string;
  },
  project: { id: string; name: string },
  boundary: PlanDateBoundary,
  now: Date
): TodayTaskSummary => ({
  actualSeconds: summarizeSessionIntervals(task.loggedTime, { ...boundary, now }).trackedSeconds,
  createdAt: task.createdAt.toISOString(),
  currentNextStep: task.currentNextStep,
  openSessionStartedAt: openSessionStartedAt(task.loggedTime),
  project,
  status: normalizeExecutionState(task.status),
  taskId: task.id,
  title: task.title,
});

const buildWorkload = (
  items: TodayPlanItem[],
  capacityMinutes: number | null
): TodayWorkload => {
  const plannedMinutes = items.reduce((total, item) => total + (item.plannedMinutes ?? 0), 0);
  const actualSeconds = items.reduce((total, item) => total + item.actualSeconds, 0);

  if (capacityMinutes === null) {
    return {
      actualSeconds,
      capacityMinutes,
      plannedMinutes,
      remainingMinutes: null,
      state: 'unset',
      utilizationPercent: null,
    };
  }

  const utilizationPercent = capacityMinutes === 0 ? 0 : (plannedMinutes / capacityMinutes) * 100;
  const state =
    plannedMinutes > capacityMinutes
      ? 'over'
      : plannedMinutes >= capacityMinutes * NEAR_CAPACITY_RATIO
        ? 'near'
        : 'under';

  return {
    actualSeconds,
    capacityMinutes,
    plannedMinutes,
    remainingMinutes: capacityMinutes - plannedMinutes,
    state,
    utilizationPercent,
  };
};

export const readTodayForOwner = async ({
  clock = () => new Date(),
  ownerId,
  planDate,
  prisma,
}: ReadTodayOptions): Promise<TodayViewModel> => {
  const now = clock();
  const owner = await prisma.user.findUnique({
    select: { dailyCapacityMinutes: true, timezone: true, todayRevision: true },
    where: { id: ownerId },
  });
  if (!owner) throw new Error('Today owner not found');

  const selectedDate = planDate ? parsePlanDateKey(planDate) : derivePlanDate(now, owner.timezone);
  const selectedBoundary = getPlanDateBoundary(selectedDate.key, owner.timezone);

  const [projectRows, planRows, backlogRows, carryoverRows, runningRows] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
      where: { archived: false, ownerId },
    }),
    prisma.dailyPlanItem.findMany({
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        createdAt: true,
        id: true,
        outcome: true,
        plannedMinutes: true,
        position: true,
        Project: { select: { id: true, name: true } },
        Task: {
          select: {
            createdAt: true,
            currentNextStep: true,
            id: true,
            loggedTime: { select: { endedAt: true, startedAt: true } },
            status: true,
            title: true,
          },
        },
      },
      where: {
        outcome: { in: [...ACTIVE_PLAN_OUTCOMES] },
        planDate: selectedDate.date,
        userId: ownerId,
      },
    }),
    prisma.task.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        createdAt: true,
        currentNextStep: true,
        defaultPlannedMinutes: true,
        id: true,
        loggedTime: { select: { endedAt: true, startedAt: true } },
        Project: { select: { id: true, name: true } },
        status: true,
        title: true,
      },
      where: {
        Project: { archived: false },
        dailyPlans: {
          none: { outcome: { in: [...ACTIVE_PLAN_OUTCOMES] }, planDate: selectedDate.date },
        },
        status: { notIn: [...TERMINAL_TASK_STATUSES] },
        userId: ownerId,
      },
    }),
    prisma.dailyPlanItem.findMany({
      orderBy: [{ planDate: 'desc' }, { position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        createdAt: true,
        id: true,
        planDate: true,
        plannedMinutes: true,
        position: true,
        Project: { select: { id: true, name: true } },
        Task: {
          select: {
            createdAt: true,
            currentNextStep: true,
            id: true,
            loggedTime: { select: { endedAt: true, startedAt: true } },
            status: true,
            title: true,
          },
        },
      },
      where: {
        outcome: 'OPEN',
        planDate: { lt: selectedDate.date },
        Project: { archived: false },
        Task: { status: { notIn: [...TERMINAL_TASK_STATUSES] } },
        userId: ownerId,
      },
    }),
    prisma.workSession.findMany({
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        startedAt: true,
        Project: { select: { id: true, name: true } },
        Task: {
          select: {
            createdAt: true,
            currentNextStep: true,
            id: true,
            loggedTime: { select: { endedAt: true, startedAt: true } },
            status: true,
            title: true,
          },
        },
      },
      where: { endedAt: null, userId: ownerId },
    }),
  ]);

  const items: TodayPlanItem[] = planRows.map((row) => ({
    ...toTaskSummary(row.Task, row.Project, selectedBoundary, now),
    id: row.id,
    outcome: row.outcome as TodayPlanItem['outcome'],
    plannedMinutes: row.plannedMinutes,
    position: row.position,
  }));
  const plannedTaskIds = new Set(items.map((item) => item.taskId));

  const backlog: TodayBacklogItem[] = backlogRows.map((task) => ({
    ...toTaskSummary(task, task.Project, selectedBoundary, now),
    defaultPlannedMinutes: task.defaultPlannedMinutes,
  }));

  const carryover: TodayCarryoverItem[] = [];
  const carryoverTaskIds = new Set<string>();
  for (const row of carryoverRows) {
    if (plannedTaskIds.has(row.Task.id) || carryoverTaskIds.has(row.Task.id)) continue;
    carryoverTaskIds.add(row.Task.id);
    carryover.push({
      ...toTaskSummary(row.Task, row.Project, selectedBoundary, now),
      id: row.id,
      plannedMinutes: row.plannedMinutes,
      position: row.position,
      sourcePlanDate: row.planDate.toISOString().slice(0, 10),
    });
  }

  const runningIndicators: TodayRunningIndicator[] = runningRows.map((row) => ({
    elapsedSeconds: sessionSeconds({ endedAt: null, startedAt: row.startedAt }, now),
    project: row.Project,
    sessionId: row.id,
    startedAt: row.startedAt.toISOString(),
    taskId: row.Task.id,
    title: row.Task.title,
  }));

  let focus: TodayFocusItem | null = null;
  const foregroundRunning = runningRows[0];
  if (foregroundRunning) {
    const plannedItem = items.find((item) => item.taskId === foregroundRunning.Task.id);
    focus = plannedItem
      ? {
          ...plannedItem,
          planItemId: plannedItem.id,
          source: 'planned',
        }
      : {
          ...toTaskSummary(foregroundRunning.Task, foregroundRunning.Project, selectedBoundary, now),
          planItemId: null,
          plannedMinutes: null,
          source: 'running',
        };
  } else {
    const firstOpenItem = items.find((item) => item.outcome === 'OPEN');
    if (firstOpenItem) {
      focus = {
        ...firstOpenItem,
        planItemId: firstOpenItem.id,
        source: 'planned',
      };
    }
  }

  const workload = buildWorkload(items, owner.dailyCapacityMinutes);

  return {
    backlog,
    carryover,
    focus,
    generatedAt: now.toISOString(),
    items,
    planDate: selectedDate.key,
    projects: projectRows,
    revision: owner.todayRevision,
    runningIndicators,
    summary: {
      actualSeconds: workload.actualSeconds,
      cancelledCount: items.filter((item) => item.outcome === 'CANCELLED').length,
      completedCount: items.filter((item) => item.outcome === 'COMPLETED').length,
      openCount: items.filter((item) => item.outcome === 'OPEN').length,
      totalCount: items.length,
    },
    timezone: owner.timezone,
    workload,
  };
};
