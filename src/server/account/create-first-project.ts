import type { PrismaClient } from '../../../generated/prisma/client';
import { createFirstProjectSchema } from '../../schema/project';
import type { DomainResult } from '../tasks/task-transition-types';
import { isTransitionSerializationError } from '../tasks/transition-task';
import { readTodayForOwner } from '../today/read-today';
import type { TodayViewModel } from '../today/today-types';

type FirstProjectResult = DomainResult<{ projectId: string; today: TodayViewModel }>;
const failure = (
  code: 'CONFLICT' | 'NOT_FOUND' | 'VALIDATION_ERROR',
  message: string,
  retryable = false
): FirstProjectResult => ({
  ok: false,
  error: { code, message, retryable },
});

export const createFirstProjectForOwner = async ({
  prisma,
  ownerId,
  input,
}: {
  prisma: PrismaClient;
  ownerId: string;
  input: { projectId: string; name: string };
}): Promise<FirstProjectResult> => {
  const parsed = createFirstProjectSchema.safeParse(input);
  if (!parsed.success)
    return failure('VALIDATION_ERROR', 'Enter a project name between 1 and 80 characters and a valid project ID.');
  const { projectId, name } = parsed.data;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
          const owners = await tx.$queryRaw<
            { id: string }[]
          >`SELECT "id" FROM "User" WHERE "id" = ${ownerId} FOR UPDATE`;
          if (!owners.length) return { error: failure('NOT_FOUND', 'Account unavailable.') };
          const existing = await tx.project.findUnique({
            where: { id: projectId },
            select: { id: true, ownerId: true, name: true, archived: true },
          });
          if (existing) {
            if (existing.ownerId !== ownerId) return { error: failure('NOT_FOUND', 'Project unavailable.') };
            if (existing.name !== name || existing.archived)
              return { error: failure('CONFLICT', 'This project changed. Open Projects to manage it.') };
            return { projectId, conflict: false };
          }
          const active = await tx.project.findFirst({ where: { ownerId, archived: false }, select: { id: true } });
          if (active) return { projectId: active.id, conflict: true };
          await tx.project.create({ data: { id: projectId, name, ownerId } });
          await tx.user.update({
            where: { id: ownerId },
            data: { currentProjectId: projectId, todayRevision: { increment: 1 } },
          });
          return { projectId, conflict: false };
        },
        { isolationLevel: 'Serializable' }
      );
      if (outcome.error) return outcome.error;
      // A failure here may follow a committed create. The caller must retry the same ID.
      const today = await readTodayForOwner({ prisma, ownerId });
      const data = { projectId: outcome.projectId, today };
      return outcome.conflict
        ? {
            ok: false,
            error: {
              code: 'CONFLICT',
              message: 'You already have an active project. Continue with your saved projects.',
              retryable: false,
            },
            canonical: data,
          }
        : { ok: true, data };
    } catch (error) {
      if (isTransitionSerializationError(error) && attempt === 0) continue;
      return failure(
        'CONFLICT',
        'Could not confirm your project. Retry with the same project details to check the saved result.',
        true
      );
    }
  }
  return failure('CONFLICT', 'Could not confirm your project. Retry with the same project details.', true);
};
