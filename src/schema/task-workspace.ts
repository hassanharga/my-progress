import { z } from 'zod';

import { hasRichTextContent } from '@/lib/rich-text-content';

const identifier = z.uuid();
const richText = z.string().trim().max(20_000);
const progressContent = richText.min(1).refine(hasRichTextContent, 'Progress update cannot be empty');

const transitionInputSchema = z
  .object({
    completionSummary: richText.optional(),
    event: z.enum(['START', 'PAUSE', 'COMPLETE', 'CANCEL']),
    nextStep: richText.optional(),
    progressNote: richText.optional(),
    taskId: identifier,
  })
  .strict();

export const taskWorkspaceMutationSchema = z.discriminatedUnion('type', [
  z
    .object({
      description: z.string().trim().max(20_000),
      projectId: identifier,
      taskId: identifier,
      type: z.literal('UPDATE_DESCRIPTION'),
    })
    .strict(),
  z
    .object({
      content: progressContent,
      nextStep: richText.optional(),
      projectId: identifier,
      taskId: identifier,
      type: z.literal('LOG_PROGRESS'),
    })
    .strict(),
  z
    .object({
      nextStep: richText,
      projectId: identifier,
      taskId: identifier,
      type: z.literal('UPDATE_NEXT_STEP'),
    })
    .strict(),
  z
    .object({
      projectId: identifier,
      transition: transitionInputSchema,
      type: z.literal('TRANSITION'),
    })
    .strict(),
]);

export type TaskWorkspaceMutation = z.infer<typeof taskWorkspaceMutationSchema>;

export const taskWorkspaceQuerySchema = z
  .object({
    query: z.string().trim().max(200),
    state: z.enum(['OPEN', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).nullable(),
    taskId: identifier.nullable(),
  })
  .strict();

export const taskWorkspaceActionSchema = z
  .object({
    mutation: taskWorkspaceMutationSchema,
    query: taskWorkspaceQuerySchema,
  })
  .strict();

export const correctWorkSessionInputSchema = z
  .object({
    endedAt: z.iso.datetime({ offset: true }),
    projectId: identifier,
    reason: z.string().trim().min(1).max(2_000),
    sessionId: identifier,
    startedAt: z.iso.datetime({ offset: true }),
    taskId: identifier,
  })
  .strict()
  .refine(({ endedAt, startedAt }) => Date.parse(endedAt) >= Date.parse(startedAt), {
    message: 'Session end must be at or after its start',
    path: ['endedAt'],
  });

export type CorrectWorkSessionInput = z.infer<typeof correctWorkSessionInputSchema>;

export const correctWorkSessionActionSchema = z
  .object({
    correction: correctWorkSessionInputSchema,
    query: taskWorkspaceQuerySchema,
  })
  .strict();
