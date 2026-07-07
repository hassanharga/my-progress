'use server';

import { revalidatePath } from 'next/cache';
import { startOfMonth, startOfWeek } from 'date-fns';
import { validateUserToken } from '@/helpers/validate-user';
import { formatTaskDuration } from '@/utils/calculate-elapsed-time';
import { WEEK_STARTS_ON, formatDuration, type WeekStartDay } from '@/utils/time-stats';
import { logger } from '@/utils/logger';
import { z } from 'zod';

import { Task, TaskUpdateInput } from '@/types/task';
import { paths } from '@/paths';
import { actionClient } from '@/lib/action-client';
import prisma from '@/lib/db';

export const createTask = actionClient
  .inputSchema(z.object({ title: z.string(), progress: z.string().optional() }))
  .action(async ({ parsedInput: { title, progress } }) => {
    const user = await validateUserToken();

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentProjectId: true },
    });

    if (!userData?.currentProjectId) {
      throw new Error('No active project. Create or select a project first.');
    }

    await prisma.task.create({
      data: {
        title,
        progress,
        userId: user.id!,
        projectId: userData.currentProjectId,
        loggedTime: {
          create: {
            from: new Date(),
          },
        },
      },
    });

    revalidatePath(paths.dashboard);
  });

export const updateTask = actionClient
  .inputSchema(
    z.object({
      id: z.uuid(),
      status: z.enum(['PAUSED', 'RESUMED', 'CANCELLED', 'COMPLETED']),
      progress: z.string().optional(),
      todo: z.string().optional(),
    })
  )
  .action(async ({ parsedInput: { id, status, progress, todo } }) => {
    await validateUserToken();

    // get last logged time by task id
    const lastLoggedTime = await prisma.taskTime.findFirst({
      where: { taskId: id },
      orderBy: { from: 'desc' },
    });

    // prepare data based on status
    // if status is 'PAUSED' then set status 'PAUSED and update last logged time
    // if status is 'RESUMED' then set status 'RESUMED and create new logged time
    // if status is 'CANCELLED' then set status 'CANCELLED update last logged time
    // if status is 'COMPLETED' then set status 'COMPLETED and add todo and progress data and update last logged time

    const data: TaskUpdateInput = { status };

    // When ending a session (PAUSED/CANCELLED/COMPLETED), calculate the
    // session duration and increment totalSeconds
    if (
      status &&
      ['PAUSED', 'CANCELLED', 'COMPLETED'].includes(status as string) &&
      !lastLoggedTime?.to
    ) {
      const now = new Date();
      const sessionSeconds = lastLoggedTime?.from
        ? (now.getTime() - lastLoggedTime.from.getTime()) / 1000
        : 0;

      data.loggedTime = {
        update: {
          data: { to: now },
          where: { id: lastLoggedTime?.id },
        },
      };
      data.totalSeconds = { increment: Math.max(0, sessionSeconds) };
    }

    if (status === 'RESUMED') {
      data.loggedTime = { create: { from: new Date() } };
    }

    if (status === 'COMPLETED') {
      if (progress) data.progress = progress as string | null;
      if (todo) data.todo = todo as string | null;
    }

    await prisma.task.update({
      where: { id },
      data,
    });

    revalidatePath(paths.dashboard);
  });

export const updateTaskDetails = actionClient
  .inputSchema(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).optional(),
      progress: z.string().optional(),
      todo: z.string().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    const { id, ...fields } = parsedInput;

    const { count } = await prisma.task.updateMany({
      where: { id, userId: user.id },
      data: fields,
    });

    if (count === 0) {
      throw new Error('Task not found');
    }

    revalidatePath(paths.dashboard);
  });

const mapTask = (
  task:
    | (Task & { loggedTime?: { from: Date; to: Date | null }[] })
    | null
) => {
  if (!task) return null;

  const { loggedTime, ...data } = task;
  const isActive = ['IN_PROGRESS', 'RESUMED'].includes(task.status);
  const openSession = loggedTime?.find((s) => !s.to);
  const activeFrom = isActive && openSession ? openSession.from : null;

  return {
    ...data,
    duration: formatTaskDuration(task.totalSeconds, activeFrom),
  };
};

export const findUserLastWorkingTask = async () => {
  const user = await validateUserToken();

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currentProjectId: true },
  });
  if (!userData?.currentProjectId) return null;

  const task = await prisma.task.findFirst({
    where: {
      status: { in: ['IN_PROGRESS', 'RESUMED', 'PAUSED'] },
      userId: user.id,
      projectId: userData.currentProjectId,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      loggedTime: {
        select: { from: true, to: true },
        orderBy: { from: 'desc' },
        take: 1,
        where: { to: null },
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
      status: { notIn: ['IN_PROGRESS', 'RESUMED', 'PAUSED'] },
      userId: user.id,
      projectId: userData.currentProjectId,
    },
    orderBy: { updatedAt: 'desc' },
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
        select: { from: true, to: true },
        orderBy: { from: 'desc' },
        take: 1,
        where: { to: null },
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
      const isActive = ['IN_PROGRESS', 'RESUMED'].includes(task.status);
      const openSession = loggedTime?.find((s) => !s.to);
      const activeFrom = isActive && openSession ? openSession.from : null;

      return {
        ...task,
        totalSeconds,
        createdAt,
        duration: formatTaskDuration(totalSeconds, activeFrom),
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

export const getTaskById = actionClient.inputSchema(z.object({ taskId: z.uuid() })).action(async ({ parsedInput }) => {
  const { taskId } = parsedInput;
  const user = await validateUserToken();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
    include: {
      loggedTime: {
        select: { from: true, to: true },
        orderBy: { from: 'desc' },
        take: 1,
        where: { to: null },
      },
    },
  });

  logger.debug('[getTaskById]', task);

  return mapTask(task);
});

type StatsRow = { week_seconds: number; month_seconds: number };

export const getTaskStats = async () => {
  const user = await validateUserToken();

  const userPrefs = await prisma.user.findUnique({
    where: { id: user.id! },
    select: { weekStartDay: true, currentProjectId: true },
  });
  const weekStartDay: WeekStartDay = userPrefs?.weekStartDay ?? 'MONDAY';
  const projectId = userPrefs?.currentProjectId;

  const zeroes = {
    totalTime: formatDuration(0),
    completedTasks: 0,
    thisWeekTime: formatDuration(0),
    thisMonthTime: formatDuration(0),
  };
  if (!projectId) return zeroes;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON[weekStartDay] });
  const monthStart = startOfMonth(now);

  const [totalSecondsRow, periodStats, statusGroups] = await Promise.all([
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM("totalSeconds"), 0)::float AS total
      FROM "Task"
      WHERE "userId" = ${user.id} AND "projectId" = ${projectId}
    `,
    prisma.$queryRaw<StatsRow[]>`
      SELECT
        COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM
          (LEAST(COALESCE("to", ${now}), ${now}) - GREATEST("from", ${weekStart}))))), 0)::float AS week_seconds,
        COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM
          (LEAST(COALESCE("to", ${now}), ${now}) - GREATEST("from", ${monthStart}))))), 0)::float AS month_seconds
      FROM "TaskTime" tt
      JOIN "Task" t ON t.id = tt."taskId"
      WHERE t."userId" = ${user.id} AND t."projectId" = ${projectId} AND (tt."to" IS NULL OR tt."to" >= ${monthStart})
    `,
    prisma.task.groupBy({
      by: ['status'],
      where: { userId: user.id, projectId },
      _count: { status: true },
    }),
  ]);

  const totalSeconds = totalSecondsRow[0]?.total ?? 0;
  const row = periodStats[0] ?? { week_seconds: 0, month_seconds: 0 };
  const completedCount = statusGroups.find((g) => g.status === 'COMPLETED')?._count.status ?? 0;

  return {
    totalTime: formatDuration(totalSeconds),
    completedTasks: completedCount,
    thisWeekTime: formatDuration(row.week_seconds),
    thisMonthTime: formatDuration(row.month_seconds),
  };
};
