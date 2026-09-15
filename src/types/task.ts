import type { ExecutionState } from '@/server/tasks/task-transition-types';

import { findUserLastTask, findUserLastWorkingTask } from '@/actions/task';

import type { Task as ITask } from '../../generated/prisma/client';

export type Task = Omit<ITask, 'status'> & { status: ExecutionState };
export type TaskStatus = ExecutionState;

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  duration: string;
  totalSeconds: number;
  createdAt: Date;
};

export type TaskWithLoggedTime = Awaited<ReturnType<typeof findUserLastWorkingTask>>;
export type LastTaskWithLoggedTime = Awaited<ReturnType<typeof findUserLastTask>>;
