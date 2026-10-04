import type { PrismaClient } from '../../../generated/prisma/client';

export const readFirstUseForOwner = async ({ prisma, ownerId }: { prisma: PrismaClient; ownerId: string }) =>
  prisma.$transaction(
    async (tx) => {
      const activeProjectCount = await tx.project.count({ where: { ownerId, archived: false } });
      const archivedProjectCount = await tx.project.count({ where: { ownerId, archived: true } });
      const taskCount = await tx.task.count({ where: { userId: ownerId } });
      return { activeProjectCount, archivedProjectCount, taskCount };
    },
    { isolationLevel: 'RepeatableRead' }
  );
