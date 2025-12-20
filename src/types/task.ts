import type { Task as ITask, TaskStatus as ITaskStatus, Prisma } from '../../generated/prisma/client';

export type Task = ITask;
export type TaskUpdateInput = Prisma.TaskUpdateInput;
export type TaskStatus = ITaskStatus;
