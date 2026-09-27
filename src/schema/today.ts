import { z } from 'zod';

import { taskTransitionSchema } from './task';

const planDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Plan date must use YYYY-MM-DD');
const taskId = z.uuid();
const plannedMinutes = z.number().int().min(1).max(1440).nullable();
const projectId = z.uuid();
const requestId = z.uuid();

export const createTodayTaskInputSchema = z.object({
  description: z.string().trim().max(20_000).optional(),
  planDate,
  plannedMinutes: plannedMinutes.optional(),
  projectId,
  requestId,
  startNow: z.boolean().default(false),
  title: z.string().trim().min(1).max(200),
});

export type CreateTodayTaskInput = z.infer<typeof createTodayTaskInputSchema>;

const moveMutation = z
  .object({
    planDate,
    position: z.number().int().nonnegative().optional(),
    direction: z.enum(['UP', 'DOWN']).optional(),
    taskId,
    type: z.literal('MOVE'),
  })
  .refine(({ direction, position }) => direction !== undefined || position !== undefined, {
    message: 'Move requires a direction or an explicit position',
  });

export const todayMutationSchema = z.discriminatedUnion('type', [
  z.object({ planDate, plannedMinutes: plannedMinutes.optional(), taskId, type: z.literal('ADD') }),
  z.object({ planDate, plannedMinutes, taskId, type: z.literal('SET_PLANNED_MINUTES') }),
  z.object({ planDate, plannedMinutes, taskId, type: z.literal('UPDATE_PLANNED_MINUTES') }),
  moveMutation,
  z.object({ planDate, taskId, type: z.literal('REMOVE') }),
  z.object({ planDate, taskId, type: z.literal('RETURN_TO_BACKLOG'), viewPlanDate: planDate.optional() }),
  z.object({ planDate, targetPlanDate: planDate, taskId, type: z.literal('MOVE_TO_DATE'), viewPlanDate: planDate.optional() }),
  z.object({ planDate, sourcePlanDate: planDate, taskId, type: z.literal('KEEP_TODAY') }),
]);

export type TodayMutationInput = z.infer<typeof todayMutationSchema>;

export const transitionTodayTaskSchema = z.object({
  planDate,
  transition: taskTransitionSchema,
});

export type TransitionTodayTaskInput = z.infer<typeof transitionTodayTaskSchema>;
