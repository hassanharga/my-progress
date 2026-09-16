'use server';

import { revalidatePath } from 'next/cache';
import { validateUserToken } from '@/helpers/validate-user';
import { createTodayTaskInputSchema, todayMutationSchema, transitionTodayTaskSchema } from '@/schema/today';
import { transitionTodayTaskForOwner } from '@/server/tasks/transition-task';
import { createTodayTaskForOwner, mutateTodayForOwner } from '@/server/today/mutate-today';

import { paths } from '@/paths';
import { actionClient } from '@/lib/action-client';
import prisma from '@/lib/db';

export const mutateToday = actionClient.inputSchema(todayMutationSchema).action(async ({ parsedInput }) => {
  const user = await validateUserToken();
  const result = await mutateTodayForOwner({ input: parsedInput, ownerId: user.id!, prisma });
  if (result.ok) revalidatePath(paths.dashboard);
  return result;
});

export const createTodayTask = actionClient.inputSchema(createTodayTaskInputSchema).action(async ({ parsedInput }) => {
  const user = await validateUserToken();
  const result = await createTodayTaskForOwner({ input: parsedInput, ownerId: user.id!, prisma });
  if (result.ok) revalidatePath(paths.dashboard);
  return result;
});

export const transitionTodayTask = actionClient
  .inputSchema(transitionTodayTaskSchema)
  .action(async ({ parsedInput }) => {
    const user = await validateUserToken();
    const result = await transitionTodayTaskForOwner({ input: parsedInput, ownerId: user.id!, prisma });
    if (result.ok) revalidatePath(paths.dashboard);
    return result;
  });
