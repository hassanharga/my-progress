import { findUserLastTask, findUserLastWorkingTask } from '@/actions/task';

import type { Task as ITask, TaskStatus as ITaskStatus, Prisma } from '../../generated/prisma/client';

export type Task = ITask;
export type TaskUpdateInput = Prisma.TaskUpdateInput;
export type TaskStatus = ITaskStatus;

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  currentCompany: string;
  currentProject: string;
  duration: string;
  totalSeconds: number;
  createdAt: Date;
};

export type TaskWithLoggedTime = Awaited<ReturnType<typeof findUserLastWorkingTask>>;
export type LastTaskWithLoggedTime = Awaited<ReturnType<typeof findUserLastTask>>;
