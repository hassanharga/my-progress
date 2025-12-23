'use server';

import { revalidatePath } from 'next/cache';
import { validateUserToken } from '@/helpers/validate-user';
import { calculateElapsedTime } from '@/utils/calculate-elapsed-time';
import { logger } from '@/utils/logger';
import { z } from 'zod';

import { Task, TaskUpdateInput } from '@/types/task';
import { paths } from '@/paths';
import { actionClient } from '@/lib/action-client';
import prisma from '@/lib/db';

export const createTask = actionClient
  .inputSchema(z.object({ title: z.string(), project: z.string().optional(), progress: z.string().optional() }))
  .action(async ({ parsedInput: { title, progress, project } }) => {
    const user = await validateUserToken();

    const useData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, currentCompany: true, currentProject: true },
    });

    await prisma.task.create({
      data: {
        title,
        progress,
        userId: user.id!,
        currentCompany: useData?.currentCompany,
        currentProject: project || useData?.currentProject,
        loggedTime: {
          create: {
            from: new Date(),
          },
        },
      },
    });

    revalidatePath(paths.home);
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

    if (status && ['PAUSED', 'CANCELLED', 'COMPLETED'].includes(status as string) && !lastLoggedTime?.to) {
      data.loggedTime = {
        update: {
          data: { to: new Date() },
          where: { id: lastLoggedTime?.id },
        },
      };
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

    revalidatePath(paths.home);
  });

const mapTask = (task: (Task & { loggedTime: { from: Date; to: Date | null }[] }) | null) => {
  if (!task) return null;

  const { loggedTime, ...data } = task || {};

  return { ...data, duration: loggedTime ? calculateElapsedTime(loggedTime)?.timeFormatted : '' };
};

export const findUserLastWorkingTask = async () => {
  const user = await validateUserToken();

  const task = await prisma.task.findFirst({
    where: { status: { in: ['IN_PROGRESS', 'RESUMED', 'PAUSED'] }, userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      loggedTime: {
        select: {
          from: true,
          to: true,
        },
      },
    },
  });

  logger.debug('[findUserLastWorkingTask]', task);

  return mapTask(task);
};

export const findUserLastTask = async () => {
  const user = await validateUserToken();

  const task = await prisma.task.findFirst({
    where: { status: { notIn: ['IN_PROGRESS', 'RESUMED', 'PAUSED'] }, userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      loggedTime: {
        select: {
          from: true,
          to: true,
        },
      },
    },
  });

  logger.debug('[findUserLastTask]', task);

  return mapTask(task);
};

export const getTasksList = actionClient
  .inputSchema(
    z.object({
      limit: z.number().default(10),
      skip: z.number().default(0),
    })
  )
  .action(async ({ parsedInput: { limit, skip } }) => {
    const user = await validateUserToken();

    const tasksCount = prisma.task.count({ where: { userId: user.id } });

    const tasksPromise = prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        currentCompany: true,
        currentProject: true,
        loggedTime: {
          select: {
            from: true,
            to: true,
          },
        },
      },
    });

    const [total, tasks] = await Promise.all([tasksCount, tasksPromise]);

    logger.debug('[getTasksList]', { limit, skip, total, tasks });

    return {
      total,
      tasks: tasks.map(({ loggedTime, currentCompany, currentProject, ...task }) => ({
        ...task,
        currentCompany: currentCompany || '-',
        currentProject: currentProject || '-',
        duration: calculateElapsedTime(loggedTime)?.timeFormatted,
      })),
    };
  });

export const getTaskById = actionClient.inputSchema(z.object({ taskId: z.uuid() })).action(async ({ parsedInput }) => {
  const { taskId } = parsedInput;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      loggedTime: { select: { from: true, to: true } },
    },
  });

  logger.debug('[getTaskById]', task);

  return mapTask(task);
});

export const getTaskStats = async () => {
  const user = await validateUserToken();

  // Get all tasks for the user
  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    include: {
      loggedTime: { select: { from: true, to: true } },
    },
  });

  // Calculate total time
  let totalMinutes = 0;
  tasks.forEach((task) => {
    const duration = calculateElapsedTime(task.loggedTime);
    // Parse duration like "2h 30m" or "45m"
    const hours = duration?.hours || 0;
    const minutes = duration?.minutes || 0;
    totalMinutes += hours * 60 + minutes;
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  const totalTime = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  // Count completed tasks
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;

  // Count active tasks
  const activeTasks = tasks.filter((t) => ['IN_PROGRESS', 'RESUMED', 'PAUSED'].includes(t.status)).length;

  // Calculate this week's time
  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

  let thisWeekMinutes = 0;
  tasks.forEach((task) => {
    task.loggedTime.forEach((log) => {
      if (new Date(log.from) >= startOfWeek) {
        const end = log.to ? new Date(log.to) : new Date();
        const diff = Math.floor((end.getTime() - new Date(log.from).getTime()) / 1000 / 60);
        thisWeekMinutes += diff;
      }
    });
  });

  const thisWeekHours = Math.floor(thisWeekMinutes / 60);
  const thisWeekMins = thisWeekMinutes % 60;
  const thisWeekTime = thisWeekHours > 0 ? `${thisWeekHours}h ${thisWeekMins}m` : `${thisWeekMins}m`;

  return {
    totalTime,
    completedTasks,
    activeTasks,
    thisWeekTime,
  };
};
