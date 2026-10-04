import type { Prisma, PrismaClient } from '../../../generated/prisma/client';
import type { ReportingQuery } from '../../schema/reporting';
import { clipSessionInterval } from '../stats/session-intervals';
import { normalizeExecutionState } from '../tasks/task-queries';
import type { ExecutionState } from '../tasks/task-transition-types';
import { calculateReportingFacts } from './calculate-reporting';
import { resolveReportingBoundary } from './reporting-scope';
import type { ReportingFacts, ReportingSource } from './reporting-types';

export type ReportingTaskRow = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: ExecutionState;
  plannedMinutes: number;
  missingEstimateCount: number;
  trackedSeconds: number;
  sessionCount: number;
};

export type ReportingSessionRow = {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  startedAt: Date;
  endedAt: Date | null;
  correctedAt: Date | null;
  scopedStartedAt: Date;
  scopedEndedAt: Date;
  scopedSeconds: number;
};

export type ReportingSnapshot = {
  query: ReportingQuery;
  timezone: string;
  weekStartDay: 'SUNDAY' | 'MONDAY' | 'SATURDAY';
  generatedAt: Date;
  ownedProjects: Array<{ id: string; name: string; archived: boolean }>;
  facts: ReportingFacts;
  taskRows: ReportingTaskRow[];
  sessionRows: ReportingSessionRow[];
};

export const readReportingForOwner = async ({
  ownerId,
  query,
  prisma,
  clock = () => new Date(),
}: {
  ownerId: string;
  query: ReportingQuery;
  prisma: PrismaClient | Prisma.TransactionClient;
  clock?: () => Date;
}): Promise<ReportingSnapshot | null> => {
  const generatedAt = clock();
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { timezone: true, weekStartDay: true },
  });
  if (!owner) return null;

  const ownedProjects = await prisma.project.findMany({
    where: { ownerId },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, archived: true },
  });
  if (query.projectId && !ownedProjects.some((project) => project.id === query.projectId)) return null;

  const boundary = resolveReportingBoundary(query, owner.timezone);
  const projectWhere = query.projectId ? { projectId: query.projectId } : {};
  const [planRows, sessionRows] = await Promise.all([
    prisma.dailyPlanItem.findMany({
      where: {
        userId: ownerId,
        ...projectWhere,
        planDate: { gte: new Date(`${query.from}T00:00:00.000Z`), lte: new Date(`${query.to}T00:00:00.000Z`) },
      },
      select: { taskId: true, projectId: true, planDate: true, plannedMinutes: true },
    }),
    prisma.workSession.findMany({
      where: {
        userId: ownerId,
        ...projectWhere,
        startedAt: { lt: boundary.end },
        OR: [{ endedAt: { gt: boundary.start } }, { endedAt: null }],
        ...(query.correctionState === 'CORRECTED'
          ? { correctedAt: { not: null } }
          : query.correctionState === 'UNCORRECTED'
            ? { correctedAt: null }
            : {}),
      },
      select: { id: true, taskId: true, projectId: true, startedAt: true, endedAt: true, correctedAt: true },
    }),
  ]);

  const intervalBoundary = { start: boundary.start, end: boundary.end, now: generatedAt };
  const clippedSessions = sessionRows.flatMap((session) => {
    const clipped = clipSessionInterval(session, intervalBoundary);
    return clipped ? [{ session, clipped }] : [];
  });
  const sessionTaskIds = new Set(clippedSessions.map(({ session }) => session.taskId));
  const selectedPlans =
    query.correctionState === 'ALL' ? planRows : planRows.filter((plan) => sessionTaskIds.has(plan.taskId));
  const taskIds = [...new Set([...selectedPlans.map((plan) => plan.taskId), ...sessionTaskIds])];
  const taskRecords = taskIds.length
    ? await prisma.task.findMany({
        where: { userId: ownerId, id: { in: taskIds }, ...projectWhere },
        select: { id: true, projectId: true, title: true, status: true },
      })
    : [];
  const tasks = taskRecords
    .map((task) => ({ ...task, status: normalizeExecutionState(task.status) }))
    .filter((task) => query.taskState === 'ALL' || task.status === query.taskState);
  const selectedTaskIds = new Set(tasks.map((task) => task.id));
  const plans: ReportingSource['plans'] = selectedPlans.filter((plan) => selectedTaskIds.has(plan.taskId));
  const sessions: ReportingSource['sessions'] = clippedSessions
    .filter(({ session }) => selectedTaskIds.has(session.taskId))
    .map(({ session }) => session);
  const projectNames = new Map(ownedProjects.map((project) => [project.id, project.name]));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const source: ReportingSource = {
    projects: query.projectId ? ownedProjects.filter((project) => project.id === query.projectId) : ownedProjects,
    tasks,
    plans,
    sessions,
  };
  const facts = calculateReportingFacts({
    source,
    query,
    timezone: owner.timezone,
    weekStartDay: owner.weekStartDay,
    now: generatedAt,
  });
  const planTotals = new Map<string, { plannedMinutes: number; missingEstimateCount: number }>();
  for (const plan of plans) {
    const total = planTotals.get(plan.taskId) ?? { plannedMinutes: 0, missingEstimateCount: 0 };
    if (plan.plannedMinutes === null) total.missingEstimateCount += 1;
    else total.plannedMinutes += plan.plannedMinutes;
    planTotals.set(plan.taskId, total);
  }
  const sessionTotals = new Map<string, { trackedSeconds: number; sessionCount: number }>();
  for (const { session, clipped } of clippedSessions) {
    if (!selectedTaskIds.has(session.taskId)) continue;
    const total = sessionTotals.get(session.taskId) ?? { trackedSeconds: 0, sessionCount: 0 };
    total.trackedSeconds += (clipped.end.getTime() - clipped.start.getTime()) / 1000;
    total.sessionCount += 1;
    sessionTotals.set(session.taskId, total);
  }

  const reportTaskRows: ReportingTaskRow[] = tasks
    .map((task) => {
      return {
        id: task.id,
        projectId: task.projectId,
        projectName: projectNames.get(task.projectId) ?? '',
        title: task.title,
        status: task.status,
        plannedMinutes: planTotals.get(task.id)?.plannedMinutes ?? 0,
        missingEstimateCount: planTotals.get(task.id)?.missingEstimateCount ?? 0,
        trackedSeconds: sessionTotals.get(task.id)?.trackedSeconds ?? 0,
        sessionCount: sessionTotals.get(task.id)?.sessionCount ?? 0,
      };
    })
    .sort(
      (left, right) =>
        left.projectName.localeCompare(right.projectName) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id)
    );
  const reportSessionRows: ReportingSessionRow[] = clippedSessions
    .filter(({ session }) => selectedTaskIds.has(session.taskId))
    .map(({ session, clipped }) => ({
      id: session.id,
      taskId: session.taskId,
      taskTitle: taskById.get(session.taskId)?.title ?? '',
      projectId: session.projectId,
      projectName: projectNames.get(session.projectId) ?? '',
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      correctedAt: session.correctedAt,
      scopedStartedAt: clipped.start,
      scopedEndedAt: clipped.end,
      scopedSeconds: (clipped.end.getTime() - clipped.start.getTime()) / 1000,
    }))
    .sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime() || left.id.localeCompare(right.id));

  return {
    query,
    timezone: owner.timezone,
    weekStartDay: owner.weekStartDay,
    generatedAt,
    ownedProjects,
    facts,
    taskRows: reportTaskRows,
    sessionRows: reportSessionRows,
  };
};
