import type { Prisma, PrismaClient, TaskStatus } from '../../../generated/prisma/client';
import type { ExecutionState, SessionSnapshot, TaskSnapshot, TaskTransitionSnapshot } from './task-transition-types';

export type TaskQueryClient = PrismaClient | Prisma.TransactionClient;

export const normalizeExecutionState = (status: TaskStatus): ExecutionState =>
  status === 'RESUMED' ? 'IN_PROGRESS' : status;

export const getClosedTaskSeconds = async (client: TaskQueryClient, taskId: string): Promise<number> => {
  const rows = await client.$queryRaw<{ total: number }[]>`
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM ("to" - "from"))), 0)::float AS total
    FROM "TaskTime"
    WHERE "taskId" = ${taskId}
      AND "to" IS NOT NULL
  `;

  return rows[0]?.total ?? 0;
};

export const readTaskSnapshot = async (
  client: TaskQueryClient,
  ownerId: string,
  taskId: string
): Promise<TaskSnapshot | null> => {
  const task = await client.task.findFirst({
    include: {
      loggedTime: {
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        take: 1,
        where: { endedAt: null },
      },
    },
    where: { id: taskId, userId: ownerId },
  });

  if (!task) return null;

  return {
    createdAt: task.createdAt,
    currentNextStep: task.currentNextStep,
    id: task.id,
    openSessionStartedAt: task.loggedTime[0]?.startedAt ?? null,
    projectId: task.projectId,
    status: normalizeExecutionState(task.status),
    title: task.title,
    totalSeconds: task.totalSeconds,
  };
};

export const readSessionSnapshot = async (
  client: TaskQueryClient,
  ownerId: string,
  sessionId: string | null
): Promise<SessionSnapshot | null> => {
  if (!sessionId) return null;
  const session = await client.workSession.findFirst({ where: { id: sessionId, userId: ownerId } });
  if (!session) return null;

  return {
    endedAt: session.endedAt,
    id: session.id,
    projectId: session.projectId,
    startedAt: session.startedAt,
    taskId: session.taskId,
  };
};

export const getUserPlanDate = (now: Date, timezone: string): { date: Date; key: string } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const key = `${values.year}-${values.month}-${values.day}`;
  return { date: new Date(`${key}T00:00:00.000Z`), key };
};

export const readTransitionSnapshot = async ({
  client,
  ownerId,
  projectId,
  replacedTaskId,
  sessionId,
  taskId,
  today,
}: {
  client: TaskQueryClient;
  ownerId: string;
  projectId: string;
  replacedTaskId: string | null;
  sessionId: string | null;
  taskId: string;
  today: { date: Date; key: string } | null;
}): Promise<TaskTransitionSnapshot> => {
  const [task, replacedTask, session, statusGroups, trackedRows, planItems] = await Promise.all([
    readTaskSnapshot(client, ownerId, taskId),
    replacedTaskId ? readTaskSnapshot(client, ownerId, replacedTaskId) : Promise.resolve(null),
    readSessionSnapshot(client, ownerId, sessionId),
    client.task.groupBy({
      _count: { status: true },
      by: ['status'],
      where: { projectId, userId: ownerId },
    }),
    client.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM ("to" - "from"))), 0)::float AS total
      FROM "TaskTime"
      WHERE "userId" = ${ownerId}
        AND "projectId" = ${projectId}
        AND "to" IS NOT NULL
    `,
    today
      ? client.dailyPlanItem.findMany({
          select: { outcome: true, plannedMinutes: true },
          where: { planDate: today.date, userId: ownerId },
        })
      : Promise.resolve([]),
  ]);

  if (!task) throw new Error('Invariant violation: transitioned task is no longer readable');

  const count = (status: TaskStatus): number =>
    statusGroups.find((group) => group.status === status)?._count.status ?? 0;
  const runningCount = count('IN_PROGRESS') + count('RESUMED');
  const pausedCount = count('PAUSED');

  return {
    project: {
      id: projectId,
      openWorkCount: count('READY') + runningCount + pausedCount,
      pausedCount,
      runningCount,
      runningTaskId:
        (
          await client.workSession.findFirst({
            select: { taskId: true },
            where: { endedAt: null, projectId, userId: ownerId },
          })
        )?.taskId ?? null,
      trackedSeconds: trackedRows[0]?.total ?? 0,
    },
    replacedTask,
    session,
    task,
    today: today
      ? {
          completedCount: planItems.filter(({ outcome }) => outcome === 'COMPLETED').length,
          openCount: planItems.filter(({ outcome }) => outcome === 'OPEN').length,
          planDate: today.key,
          plannedMinutes: planItems.reduce((sum, { plannedMinutes }) => sum + (plannedMinutes ?? 0), 0),
        }
      : null,
  };
};
