import { Prisma, type PrismaClient } from '../../../generated/prisma/client';
import { correctWorkSessionInputSchema, type CorrectWorkSessionInput } from '../../schema/task-workspace';
import type { ProjectWorkspaceQuery, ProjectWorkspaceViewModel } from '../projects/project-workspace-types';
import { readProjectWorkspaceForOwner } from '../projects/read-project-workspace';
import { runTodayMutationWithRetry } from '../today/mutate-today';
import type { DomainErrorCode, DomainResult } from './task-transition-types';

export type { CorrectWorkSessionInput } from '../../schema/task-workspace';

type ClosedInterval = { endedAt: Date; startedAt: Date };
type LockedProject = { archived: boolean; id: string };
type LockedTask = { id: string; projectId: string };

export const halfOpenIntervalsOverlap = (left: ClosedInterval, right: ClosedInterval): boolean =>
  left.startedAt < left.endedAt &&
  right.startedAt < right.endedAt &&
  left.startedAt < right.endedAt &&
  right.startedAt < left.endedAt;

type CorrectionResult = DomainResult<ProjectWorkspaceViewModel>;

const errorResult = (
  code: DomainErrorCode,
  message: string,
  retryable = false,
  canonical?: ProjectWorkspaceViewModel
): CorrectionResult => ({
  ...(canonical ? { canonical } : {}),
  error: { code, message, retryable },
  ok: false,
});

const lockOwnedProject = async (
  tx: Prisma.TransactionClient,
  ownerId: string,
  projectId: string
): Promise<LockedProject | null> => {
  const rows = await tx.$queryRaw<LockedProject[]>`
    SELECT "id", "archived"
    FROM "Project"
    WHERE "id" = ${projectId} AND "ownerId" = ${ownerId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
};

const lockOwnedTask = async (
  tx: Prisma.TransactionClient,
  ownerId: string,
  taskId: string
): Promise<LockedTask | null> => {
  const rows = await tx.$queryRaw<LockedTask[]>`
    SELECT "id", "projectId"
    FROM "Task"
    WHERE "id" = ${taskId} AND "userId" = ${ownerId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
};

const canonicalWorkspace = (
  prisma: PrismaClient | Prisma.TransactionClient,
  ownerId: string,
  projectId: string,
  query: ProjectWorkspaceQuery
) => readProjectWorkspaceForOwner({ ownerId, projectId, prisma, query });

export async function correctWorkSessionForOwner({
  afterCorrection,
  clock = () => new Date(),
  correction,
  ownerId,
  prisma,
  query,
}: {
  /** Test-only rollback seam; safe actions never provide this hook. */
  afterCorrection?: () => Promise<void>;
  clock?: () => Date;
  correction: CorrectWorkSessionInput;
  ownerId: string;
  prisma: PrismaClient;
  query: ProjectWorkspaceQuery;
}): Promise<CorrectionResult> {
  const parsed = correctWorkSessionInputSchema.safeParse(correction);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid session correction');
  }

  const normalized = parsed.data;
  const startedAt = new Date(normalized.startedAt);
  const endedAt = new Date(normalized.endedAt);
  const canonicalQuery = query.taskId === normalized.taskId ? query : { ...query, taskId: normalized.taskId };

  return runTodayMutationWithRetry({
    execute: () =>
      prisma.$transaction(
        async (tx) => {
          const project = await lockOwnedProject(tx, ownerId, normalized.projectId);
          if (!project) return errorResult('NOT_FOUND', 'Project not found');

          const task = await lockOwnedTask(tx, ownerId, normalized.taskId);
          if (!task || task.projectId !== project.id) return errorResult('NOT_FOUND', 'Session not found');

          const session = await tx.workSession.findFirst({
            where: {
              id: normalized.sessionId,
              projectId: project.id,
              taskId: task.id,
              userId: ownerId,
            },
          });
          if (!session) return errorResult('NOT_FOUND', 'Session not found');

          const readCanonical = () => canonicalWorkspace(tx, ownerId, project.id, canonicalQuery);

          if (project.archived) {
            return errorResult(
              'CONFLICT',
              'Archived projects cannot correct work sessions',
              false,
              (await readCanonical()) ?? undefined
            );
          }
          if (!session.endedAt) {
            return errorResult(
              'CONFLICT',
              'Pause the running session before correcting it',
              false,
              (await readCanonical()) ?? undefined
            );
          }

          const overlaps =
            startedAt < endedAt
              ? await tx.workSession.findFirst({
                  select: { id: true },
                  where: {
                    OR: [{ endedAt: { gt: startedAt } }, { endedAt: null }],
                    id: { not: session.id },
                    startedAt: { lt: endedAt },
                    taskId: task.id,
                    userId: ownerId,
                  },
                })
              : null;
          if (overlaps) {
            return errorResult(
              'CONFLICT',
              'The corrected session overlaps another session for this task',
              false,
              (await readCanonical()) ?? undefined
            );
          }

          await tx.workSession.update({
            data: {
              correctedAt: clock(),
              correctionReason: normalized.reason,
              endedAt,
              originalEndedAt: session.originalEndedAt ?? session.endedAt,
              originalStartedAt: session.originalStartedAt ?? session.startedAt,
              source: 'MANUAL_CORRECTION',
              startedAt,
            },
            where: { id: session.id },
          });

          const closedSessions = await tx.workSession.findMany({
            select: { endedAt: true, startedAt: true },
            where: { endedAt: { not: null }, projectId: project.id, taskId: task.id, userId: ownerId },
          });
          const totalSeconds = closedSessions.reduce(
            (total, row) => total + Math.max(0, (row.endedAt!.getTime() - row.startedAt.getTime()) / 1_000),
            0
          );
          await tx.task.update({ data: { totalSeconds }, where: { id: task.id } });

          await afterCorrection?.();
          const data = await readCanonical();
          if (!data) throw new Error('Invariant violation: corrected workspace is no longer readable');
          return { data, ok: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      ),
    reconcile: async () => {
      const canonical = await canonicalWorkspace(prisma, ownerId, normalized.projectId, canonicalQuery);
      return errorResult('CONFLICT', 'The project changed concurrently. Try again.', true, canonical ?? undefined);
    },
  });
}
