'use server';

import { revalidatePath } from 'next/cache';
import { validateUserToken } from '@/helpers/validate-user';
import { correctWorkSessionActionSchema, taskWorkspaceActionSchema } from '@/schema/task-workspace';
import { correctWorkSessionForOwner } from '@/server/tasks/correct-work-session';
import { mutateTaskWorkspaceForOwner } from '@/server/tasks/mutate-task-workspace';

import { actionClient } from '@/lib/action-client';
import prisma from '@/lib/db';

export const mutateTaskWorkspace = actionClient
  .inputSchema(taskWorkspaceActionSchema)
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    const result = await mutateTaskWorkspaceForOwner({
      mutation: parsedInput.mutation,
      ownerId: user.id!,
      prisma,
      query: parsedInput.query,
    });

    if (result.ok) {
      revalidatePath('/dashboard');
      revalidatePath(`/projects/${parsedInput.mutation.projectId}`);
    }
    return result;
  });

export const correctWorkSession = actionClient
  .inputSchema(correctWorkSessionActionSchema)
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    const result = await correctWorkSessionForOwner({
      correction: parsedInput.correction,
      ownerId: user.id!,
      prisma,
      query: parsedInput.query,
    });

    if (result.ok) {
      revalidatePath('/dashboard');
      revalidatePath(`/projects/${parsedInput.correction.projectId}`);
    }
    return result;
  });
