'use server';

import { revalidatePath } from 'next/cache';
import { validateUserToken } from '@/helpers/validate-user';
import {
  createTaskInputSchema,
  taskDetailsSchema,
  taskTransitionSchema,
  type CreateTaskInputSchema,
  type TaskDetailsSchema,
} from '@/schema/task';
import { summarizeSessionIntervals, type SessionInterval } from '@/server/stats/session-intervals';
import { normalizeExecutionState } from '@/server/tasks/task-queries';
import type { TaskTransitionInput } from '@/server/tasks/task-transition-types';
import { createTaskWithTransition, transitionTask } from '@/server/tasks/transition-task';
import { formatTaskDuration } from '@/utils/calculate-elapsed-time';
import { logger } from '@/utils/logger';
import { formatDuration, getUserPeriodBoundaries, type WeekStartDay } from '@/utils/time-stats';
import { z } from 'zod';

import { paths } from '@/paths';
import { actionClient } from '@/lib/action-client';
import prisma from '@/lib/db';

import type { Prisma, PrismaClient, Task as PrismaTask } from '../../generated/prisma/client';

export const createTaskForOwner = async ({
  clock,
  input,
  ownerId,
  prisma: client,
}: {
  clock?: () => Date;
  input: CreateTaskInputSchema;
  ownerId: string;
  prisma: PrismaClient;
}) => createTaskWithTransition({ clock, input, ownerId, prisma: client });

export const updateTaskForOwner = async ({
  clock,
  input,
  ownerId,
  prisma: client,
}: {
  clock?: () => Date;
  input: TaskTransitionInput;
  ownerId: string;
  prisma: PrismaClient;
}) => transitionTask({ clock, input, ownerId, prisma: client });

export const createTask = actionClient.inputSchema(createTaskInputSchema).action(async ({ parsedInput }) => {
  const user = await validateUserToken();
  const result = await createTaskForOwner({ input: parsedInput, ownerId: user.id!, prisma });

  if (result.ok) revalidatePath(paths.dashboard);
  return result;
});

export const updateTask = actionClient.inputSchema(taskTransitionSchema).action(async ({ parsedInput }) => {
  const user = await validateUserToken();
  const result = await updateTaskForOwner({ input: parsedInput, ownerId: user.id!, prisma });

  if (result.ok) revalidatePath(paths.dashboard);
  return result;
});

type MappableTask = PrismaTask & {
  loggedTime?: { endedAt: Date | null; startedAt: Date }[];
  workLog?: { content: string }[];
};

const mapTask = (task: MappableTask | null) => {
  if (!task) return null;

  const { loggedTime, workLog, ...data } = task;
  const status = normalizeExecutionState(task.status);
  const openSession = loggedTime?.find((session) => !session.endedAt);
  const activeFrom = status === 'IN_PROGRESS' && openSession ? openSession.startedAt : null;

  return {
    ...data,
    duration: formatTaskDuration(task.totalSeconds, activeFrom),
    progress: workLog?.[0]?.content ?? task.progress,
    status,
    todo: task.currentNextStep ?? task.todo,
  };
};

type TaskReadClient = PrismaClient | Prisma.TransactionClient;

const readTaskByIdForOwner = async (client: TaskReadClient, ownerId: string, taskId: string) => {
  const task = await client.task.findFirst({
    where: { id: taskId, userId: ownerId },
    include: {
      loggedTime: {
        select: { endedAt: true, startedAt: true },
        orderBy: { startedAt: 'desc' },
        take: 1,
        where: { endedAt: null },
      },
      workLog: {
        select: { content: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
        where: { kind: 'PROGRESS' },
      },
    },
  });

  return mapTask(task);
};

export const updateTaskDetailsForOwner = async ({
  input,
  ownerId,
  prisma: client,
}: {
  input: TaskDetailsSchema;
  ownerId: string;
  prisma: PrismaClient;
}) =>
  client.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      select: { id: true, projectId: true },
      where: { id: input.id, userId: ownerId },
    });
    if (!task) {
      return {
        error: { code: 'NOT_FOUND' as const, message: 'Task not found', retryable: false },
        ok: false as const,
      };
    }

    await tx.task.update({
      data: {
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.progress !== undefined ? { progress: input.progress || null } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.todo !== undefined ? { currentNextStep: input.todo || null, todo: input.todo || null } : {}),
      },
      where: { id: task.id },
    });
    if (input.progress !== undefined) {
      await tx.workLogEntry.create({
        data: {
          content: input.progress,
          kind: 'PROGRESS',
          nextStepSnapshot: input.todo,
          projectId: task.projectId,
          taskId: task.id,
          userId: ownerId,
        },
      });
    }

    const data = await readTaskByIdForOwner(tx, ownerId, task.id);
    if (!data) throw new Error('Invariant violation: updated task is no longer readable');
    return { data, ok: true as const };
  });

export const updateTaskDetails = actionClient.inputSchema(taskDetailsSchema).action(async ({ parsedInput }) => {
  const user = await validateUserToken();
  const result = await updateTaskDetailsForOwner({ input: parsedInput, ownerId: user.id!, prisma });

  if (result.ok) revalidatePath(paths.dashboard);
  return result;
});

export const findUserLastWorkingTask = async () => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });
  if (!userData?.currentProjectId) return null;

  const task = await prisma.task.findFirst({
    where: {
      status: { in: ['IN_PROGRESS', 'PAUSED'] },
      userId: user.id,
      projectId: userData.currentProjectId,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      loggedTime: {
        select: { endedAt: true, startedAt: true },
        orderBy: { startedAt: 'desc' },
        take: 1,
        where: { endedAt: null },
      },
      workLog: {
        select: { content: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
        where: { kind: 'PROGRESS' },
      },
    },
  });

  logger.debug('[findUserLastWorkingTask]', task);

  return mapTask(task);
};

export const findUserLastTask = async () => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });
  if (!userData?.currentProjectId) return null;

  const task = await prisma.task.findFirst({
    where: {
      status: { in: ['COMPLETED', 'CANCELLED'] },
      userId: user.id,
      projectId: userData.currentProjectId,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      workLog: {
        select: { content: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
        where: { kind: 'PROGRESS' },
      },
    },
  });

  logger.debug('[findUserLastTask]', task);

  return mapTask(task);
};

export const getTasksListData = async (limit: number = 10, cursor?: string | null) => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });
  if (!userData?.currentProjectId) {
    return { hasNextPage: false, nextCursor: null, tasks: [] };
  }

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, projectId: userData.currentProjectId },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      status: true,
      totalSeconds: true,
      createdAt: true,
      loggedTime: {
        select: { endedAt: true, startedAt: true },
        orderBy: { startedAt: 'desc' },
        take: 1,
        where: { endedAt: null },
      },
    },
  });

  const hasNextPage = tasks.length > limit;
  const items = hasNextPage ? tasks.slice(0, limit) : tasks;
  const nextCursor = hasNextPage ? items[items.length - 1].id : null;

  return {
    hasNextPage,
    nextCursor,
    tasks: items.map(({ loggedTime, totalSeconds, createdAt, ...task }) => {
      const status = normalizeExecutionState(task.status);
      const openSession = loggedTime?.find((session) => !session.endedAt);
      const activeFrom = status === 'IN_PROGRESS' && openSession ? openSession.startedAt : null;

      return {
        ...task,
        totalSeconds,
        createdAt,
        duration: formatTaskDuration(totalSeconds, activeFrom),
        status,
      };
    }),
  };
};

export const getTasksList = actionClient
  .inputSchema(
    z.object({
      limit: z.number().default(10),
      cursor: z.string().nullable().optional(),
    })
  )
  .action(async ({ parsedInput: { limit, cursor } }) => {
    return getTasksListData(limit, cursor ?? null);
  });

export const getTaskByIdForOwner = async ({
  ownerId,
  prisma: client,
  taskId,
}: {
  ownerId: string;
  prisma: PrismaClient;
  taskId: string;
}) => {
  const task = await readTaskByIdForOwner(client, ownerId, taskId);
  logger.debug('[getTaskById]', task);
  return task;
};

export const getTaskById = actionClient.inputSchema(z.object({ taskId: z.uuid() })).action(async ({ parsedInput }) => {
  const user = await validateUserToken();
  return getTaskByIdForOwner({ ownerId: user.id!, prisma, taskId: parsedInput.taskId });
});

type PeriodStats = ReturnType<typeof summarizeSessionIntervals>;

type SessionPeriods = {
  allTime: PeriodStats;
  today: PeriodStats;
  thisWeek: PeriodStats;
  thisMonth: PeriodStats;
};

const summarizePeriods = (
  sessions: SessionInterval[],
  boundaries: ReturnType<typeof getUserPeriodBoundaries>,
  now: Date
): SessionPeriods => {
  const firstStart = sessions.reduce(
    (earliest, session) => Math.min(earliest, session.startedAt.getTime()),
    now.getTime()
  );
  const summarize = ({ start, end }: { start: Date; end: Date }) =>
    summarizeSessionIntervals(sessions, { end, now, start });

  return {
    allTime: summarize({ end: now, start: new Date(firstStart) }),
    thisMonth: summarize(boundaries.month),
    thisWeek: summarize(boundaries.week),
    today: summarize(boundaries.day),
  };
};

export const getTaskStatsForOwner = async ({
  now,
  ownerId,
  prisma: client,
}: {
  now: Date;
  ownerId: string;
  prisma: PrismaClient;
}) => {
  const user = await client.user.findUnique({
    select: { currentProjectId: true, timezone: true, weekStartDay: true },
    where: { id: ownerId },
  });
  const timezone = user?.timezone ?? 'UTC';
  const weekStartDay: WeekStartDay = user?.weekStartDay ?? 'MONDAY';
  const boundaries = getUserPeriodBoundaries(now, timezone, weekStartDay);
  const projectId = user?.currentProjectId ?? null;

  const [sessions, statusGroups] = await Promise.all([
    client.workSession.findMany({
      select: { endedAt: true, projectId: true, startedAt: true },
      where: { userId: ownerId },
    }),
    projectId
      ? client.task.groupBy({
          _count: { status: true },
          by: ['status'],
          where: { projectId, userId: ownerId },
        })
      : Promise.resolve([]),
  ]);

  const account = summarizePeriods(sessions, boundaries, now);
  const projectPeriods = summarizePeriods(
    sessions.filter((session) => session.projectId === projectId),
    boundaries,
    now
  );
  const count = (status: 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'): number =>
    statusGroups.find((group) => group.status === status)?._count.status ?? 0;
  const runningCount = count('IN_PROGRESS');
  const pausedCount = count('PAUSED');
  const completedCount = count('COMPLETED');
  const project = projectId
    ? {
        ...projectPeriods,
        completedCount,
        id: projectId,
        openWorkCount: count('READY') + runningCount + pausedCount,
        pausedCount,
        runningCount,
      }
    : null;

  return {
    account,
    activeTasks: runningCount + pausedCount,
    completedTasks: completedCount,
    project,
    thisMonthTime: formatDuration(project?.thisMonth.trackedSeconds ?? 0),
    thisWeekTime: formatDuration(project?.thisWeek.trackedSeconds ?? 0),
    totalTime: formatDuration(project?.allTime.trackedSeconds ?? 0),
  };
};

export const getTaskStats = async () => {
  const user = await validateUserToken();
  return getTaskStatsForOwner({ now: new Date(), ownerId: user.id!, prisma });
};
