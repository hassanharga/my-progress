import { Prisma, type PrismaClient } from '../../../generated/prisma/client';
import { taskWorkspaceMutationSchema, type TaskWorkspaceMutation } from '../../schema/task-workspace';
import { readProjectWorkspaceForOwner } from '../projects/read-project-workspace';
import type { ProjectWorkspaceQuery, ProjectWorkspaceViewModel } from '../projects/project-workspace-types';
import type { DomainErrorCode, DomainResult } from './task-transition-types';
import { transitionTaskInTransaction } from './transition-task';
import { runTodayMutationWithRetry } from '../today/mutate-today';

export type { TaskWorkspaceMutation } from '../../schema/task-workspace';

export type TaskWorkspaceMutationResult = DomainResult<ProjectWorkspaceViewModel>;

type LockedProject = { archived: boolean; id: string };
type LockedTask = { id: string; projectId: string; status: 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'RESUMED' | 'COMPLETED' | 'CANCELLED' };

const resultError = (
  code: DomainErrorCode,
  message: string,
  retryable = false,
  canonical?: ProjectWorkspaceViewModel
): TaskWorkspaceMutationResult => ({
  ...(canonical ? { canonical } : {}),
  error: { code, message, retryable },
  ok: false,
});

const mutationTaskId = (mutation: TaskWorkspaceMutation): string =>
  mutation.type === 'TRANSITION' ? mutation.transition.taskId : mutation.taskId;

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
    SELECT "id", "projectId", "status"::text AS "status"
    FROM "Task"
    WHERE "id" = ${taskId} AND "userId" = ${ownerId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
};

const terminalTaskError = (): TaskWorkspaceMutationResult =>
  resultError('INVALID_TRANSITION', 'Completed and cancelled tasks cannot accept new work');

const missingProjectError = (): TaskWorkspaceMutationResult => resultError('NOT_FOUND', 'Project not found');

const missingTaskError = (): TaskWorkspaceMutationResult => resultError('NOT_FOUND', 'Task not found');

export async function mutateTaskWorkspaceForOwner({
  afterMutation,
  mutation,
  ownerId,
  prisma,
  query,
}: {
  /** Test-only rollback seam; safe actions never provide this hook. */
  afterMutation?: () => Promise<void>;
  ownerId: string;
  mutation: TaskWorkspaceMutation;
  query: ProjectWorkspaceQuery;
  prisma: PrismaClient;
}): Promise<TaskWorkspaceMutationResult> {
  const parsed = taskWorkspaceMutationSchema.safeParse(mutation);
  if (!parsed.success) {
    return resultError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid task workspace mutation');
  }

  const normalizedMutation = parsed.data;
  const taskId = mutationTaskId(normalizedMutation);
  const canonicalQuery = query.taskId === taskId ? query : { ...query, taskId };

  return runTodayMutationWithRetry({
    execute: () =>
      prisma.$transaction(
        async (tx) => {
          const project = await lockOwnedProject(tx, ownerId, normalizedMutation.projectId);
          if (!project) return missingProjectError();

          const task = await lockOwnedTask(tx, ownerId, taskId);
          if (!task || task.projectId !== project.id) return missingTaskError();
          if (project.archived) {
            const canonical = await readCanonical({
              ownerId,
              projectId: project.id,
              prisma: tx,
              query: canonicalQuery,
            });
            return resultError(
              'CONFLICT',
              'Archived projects cannot change work',
              false,
              canonical ?? undefined
            );
          }

          if (normalizedMutation.type === 'TRANSITION') {
            const transition = await transitionTaskInTransaction({
              input: normalizedMutation.transition,
              ownerId,
              tx,
            });
            if (!transition.ok) {
              const canonical = transition.canonical
                ? await readCanonical({
                    ownerId,
                    projectId: project.id,
                    prisma: tx,
                    query: canonicalQuery,
                  })
                : null;
              return resultError(transition.error.code, transition.error.message, transition.error.retryable, canonical ?? undefined);
            }
          } else {
            if (normalizedMutation.type !== 'UPDATE_DESCRIPTION' && (task.status === 'COMPLETED' || task.status === 'CANCELLED')) return terminalTaskError();

            if (normalizedMutation.type === 'UPDATE_DESCRIPTION') {
              await tx.task.update({ data: { description: normalizedMutation.description || null }, where: { id: task.id } });
            } else if (normalizedMutation.type === 'LOG_PROGRESS') {
              await tx.task.update({
                data: {
                  currentNextStep:
                    normalizedMutation.nextStep === undefined ? undefined : normalizedMutation.nextStep || null,
                  progress: normalizedMutation.content,
                  todo: normalizedMutation.nextStep === undefined ? undefined : normalizedMutation.nextStep || null,
                },
                where: { id: task.id },
              });
              await tx.workLogEntry.create({
                data: {
                  content: normalizedMutation.content,
                  kind: 'PROGRESS',
                  nextStepSnapshot: normalizedMutation.nextStep ?? null,
                  projectId: project.id,
                  taskId: task.id,
                  userId: ownerId,
                },
              });
            } else {
              await tx.task.update({
                data: {
                  currentNextStep: normalizedMutation.nextStep || null,
                  todo: normalizedMutation.nextStep || null,
                },
                where: { id: task.id },
              });
            }
          }

          await afterMutation?.();
          const data = await readCanonical({ ownerId, projectId: project.id, prisma: tx, query: canonicalQuery });
          if (!data) throw new Error('Invariant violation: mutated workspace is no longer readable');
          return { data, ok: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      ),
    reconcile: async () => {
      const canonical = await readCanonical({
        ownerId,
        projectId: normalizedMutation.projectId,
        prisma,
        query: canonicalQuery,
      });
      return resultError('CONFLICT', 'The project changed concurrently. Try again.', true, canonical ?? undefined);
    },
  });
}
