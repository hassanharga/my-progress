import { z } from 'zod';

const optionalRichText = z.string().trim().max(20_000).optional();

export const createTaskInputSchema = z.object({
  progress: optionalRichText,
  startNow: z.boolean().default(true),
  title: z.string().trim().min(1).max(200),
});

export const taskTransitionSchema = z.object({
  taskId: z.uuid(),
  event: z.enum(['START', 'PAUSE', 'COMPLETE', 'CANCEL']),
  progressNote: optionalRichText,
  nextStep: optionalRichText,
  completionSummary: optionalRichText,
});

export const taskDetailsSchema = z.object({
  id: z.uuid(),
  progress: optionalRichText,
  title: z.string().trim().min(1).max(200).optional(),
  todo: optionalRichText,
});

export type TaskTransitionSchema = z.infer<typeof taskTransitionSchema>;
export type CreateTaskInputSchema = z.infer<typeof createTaskInputSchema>;
export type TaskDetailsSchema = z.infer<typeof taskDetailsSchema>;
