import { Prisma, type PrismaClient } from '../../../generated/prisma/client';
import type { DomainResult } from '../tasks/task-transition-types';
import { runTodayMutationWithRetry } from '../today/mutate-today';
import type { ProjectWorkspaceQuery, ProjectWorkspaceViewModel } from './project-workspace-types';
import { readProjectWorkspaceForOwner } from './read-project-workspace';

export type ProjectWorkspaceLifecycleInput = {
  type: 'ARCHIVE' | 'RESTORE';
  projectId: string;
};

type LifecycleResult = DomainResult<ProjectWorkspaceViewModel>;
type LockedProject = { archived: boolean; archivedAt: Date | null; id: string };

const notFound = (): LifecycleResult => ({
  error: { code: 'NOT_FOUND', message: 'Project not found', retryable: false },
  ok: false,
});

const lockOwnedProject = async (
  tx: Prisma.TransactionClient,
  ownerId: string,
  projectId: string
): Promise<LockedProject | null> => {
  const rows = await tx.$queryRaw<LockedProject[]>`
    SELECT "id", "archived", "archivedAt"
    FROM "Project"
    WHERE "id" = ${projectId} AND "ownerId" = ${ownerId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
};

const readCanonical = ({
  ownerId,
  projectId,
  prisma,
  query,
}: {
  ownerId: string;
  projectId: string;
  prisma: PrismaClient | Prisma.TransactionClient;
  query: ProjectWorkspaceQuery;
}) => readProjectWorkspaceForOwner({ ownerId, projectId, prisma, query });

export async function mutateProjectWorkspaceLifecycleForOwner({
  clock = () => new Date(),
  mutation,
  ownerId,
  prisma,
  query,
}: {
  clock?: () => Date;
  ownerId: string;
  mutation: ProjectWorkspaceLifecycleInput;
  query: ProjectWorkspaceQuery;
  prisma: PrismaClient;
}): Promise<LifecycleResult> {
  const execute = () =>
    prisma.$transaction(
      async (tx): Promise<LifecycleResult> => {
        const project = await lockOwnedProject(tx, ownerId, mutation.projectId);
        if (!project) return notFound();

        if (mutation.type === 'ARCHIVE') {
          const openSession = await tx.workSession.findFirst({
            select: { id: true },
            where: { endedAt: null, projectId: project.id, userId: ownerId },
          });
          if (openSession) {
            const canonical = await readCanonical({ ownerId, projectId: project.id, prisma: tx, query });
            return {
              ...(canonical ? { canonical } : {}),
              error: { code: 'CONFLICT', message: 'Pause active work before archiving', retryable: false },
              ok: false,
            };
          }

          if (!project.archived) {
            await tx.project.update({
              data: { archived: true, archivedAt: clock() },
              where: { id: project.id },
            });
          }

          const owner = await tx.user.findUnique({
            select: { currentProjectId: true },
            where: { id: ownerId },
          });
          if (owner?.currentProjectId === project.id) {
            const fallback = await tx.project.findFirst({
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              select: { id: true },
              where: { archived: false, id: { not: project.id }, ownerId },
            });
            await tx.user.update({
              data: { currentProjectId: fallback?.id ?? null },
              where: { id: ownerId },
            });
          }
        } else if (project.archived) {
          await tx.project.update({
            data: { archived: false, archivedAt: null },
            where: { id: project.id },
          });
        }

        const data = await readCanonical({ ownerId, projectId: project.id, prisma: tx, query });
        if (!data) throw new Error('Invariant violation: lifecycle workspace is no longer readable');
        return { data, ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  return runTodayMutationWithRetry({
    execute,
    reconcile: async () => {
      const canonical = await readCanonical({ ownerId, projectId: mutation.projectId, prisma, query });
      if (!canonical) return notFound();
      const reachedRequestedState =
        mutation.type === 'ARCHIVE' ? canonical.project.archived : !canonical.project.archived;
      if (reachedRequestedState) return { data: canonical, ok: true };
      return {
        canonical,
        error: { code: 'CONFLICT', message: 'The project changed concurrently. Try again.', retryable: true },
        ok: false,
      };
    },
  });
}
