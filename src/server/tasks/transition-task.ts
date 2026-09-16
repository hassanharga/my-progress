import { Prisma, type PrismaClient, type TaskStatus } from '../../../generated/prisma/client';
import { parsePlanDateKey } from '../today/plan-date';
import { readTodayForOwner } from '../today/read-today';
import type { TodayViewModel } from '../today/today-types';
import { getClosedTaskSeconds, getUserPlanDate, normalizeExecutionState, readTransitionSnapshot } from './task-queries';
import type {
  DomainResult,
  ExecutionState,
  TaskTransitionInput,
  TaskTransitionSnapshot,
} from './task-transition-types';

type TransitionTaskOptions = {
  prisma: PrismaClient;
  ownerId: string;
  input: TaskTransitionInput;
  clock?: () => Date;
};

type LockedTask = {
  archived: boolean;
  projectId: string;
  timezone: string;
};

const invalidTransition = (
  state: ExecutionState,
  event: TaskTransitionInput['event']
): DomainResult<TaskTransitionSnapshot> => ({
  error: {
    code: 'INVALID_TRANSITION',
    message: `${event} is not valid while the task is ${state}`,
    retryable: false,
  },
  ok: false,
});

const notFound = (): DomainResult<TaskTransitionSnapshot> => ({
  error: { code: 'NOT_FOUND', message: 'Task not found', retryable: false },
  ok: false,
});

const conflict = (
  message: string,
  retryable: boolean,
  canonical?: TaskTransitionSnapshot
): DomainResult<TaskTransitionSnapshot> => ({
  ...(canonical ? { canonical } : {}),
  error: { code: 'CONFLICT', message, retryable },
  ok: false,
});

const isIdempotent = (state: ExecutionState, event: TaskTransitionInput['event']): boolean =>
  (state === 'IN_PROGRESS' && event === 'START') ||
  (state === 'PAUSED' && event === 'PAUSE') ||
  (state === 'COMPLETED' && event === 'COMPLETE') ||
  (state === 'CANCELLED' && event === 'CANCEL');

const isAllowed = (state: ExecutionState, event: TaskTransitionInput['event']): boolean => {
  if (isIdempotent(state, event)) return true;
  if (event === 'START') return state === 'READY' || state === 'PAUSED';
  if (event === 'PAUSE') return state === 'IN_PROGRESS';
  if (event === 'COMPLETE' || event === 'CANCEL') {
    return state === 'READY' || state === 'IN_PROGRESS' || state === 'PAUSED';
  }
  return false;
};

const closeOpenSession = async ({
  now,
  ownerId,
  projectId,
  taskId,
  tx,
}: {
  now: Date;
  ownerId: string;
  projectId: string;
  taskId: string;
  tx: Prisma.TransactionClient;
}): Promise<string | null> => {
  const openSession = await tx.workSession.findFirst({
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    where: { endedAt: null, projectId, taskId, userId: ownerId },
  });
  if (!openSession) return null;

  await tx.workSession.update({
    data: { endedAt: now },
    where: { id: openSession.id },
  });
  const totalSeconds = await getClosedTaskSeconds(tx, taskId);
  await tx.task.update({ data: { totalSeconds }, where: { id: taskId } });
  return openSession.id;
};

const readTodayIfPlanned = async (
  tx: Prisma.TransactionClient,
  ownerId: string,
  taskId: string,
  timezone: string,
  now: Date
): Promise<{ date: Date; key: string } | null> => {
  const today = getUserPlanDate(now, timezone);
  const plan = await tx.dailyPlanItem.findUnique({
    select: { id: true },
    where: { userId_taskId_planDate: { planDate: today.date, taskId, userId: ownerId } },
  });
  return plan ? today : null;
};

const fenceProject = async (tx: Prisma.TransactionClient, projectId: string): Promise<void> => {
  await tx.$executeRaw`
    UPDATE "Project"
    SET "updatedAt" = "updatedAt"
    WHERE "id" = ${projectId}
  `;
};

const applyTransitionInTransaction = async ({
  expectedOpenTaskId,
  input,
  now,
  ownerId,
  ownership,
  todayOverride,
  tx,
}: {
  expectedOpenTaskId: string | null;
  input: TaskTransitionInput;
  now: Date;
  ownerId: string;
  ownership: LockedTask;
  todayOverride?: { date: Date; key: string };
  tx: Prisma.TransactionClient;
}): Promise<DomainResult<TaskTransitionSnapshot>> => {
  const task = await tx.task.findFirst({
    where: { id: input.taskId, projectId: ownership.projectId, userId: ownerId },
  });
  if (!task) return notFound();

  const state = normalizeExecutionState(task.status);
  if (!isAllowed(state, input.event)) return invalidTransition(state, input.event);

  const today = todayOverride
    ? (await tx.dailyPlanItem.findUnique({
        select: { id: true },
        where: { userId_taskId_planDate: { planDate: todayOverride.date, taskId: task.id, userId: ownerId } },
      }))
      ? todayOverride
      : null
    : await readTodayIfPlanned(tx, ownerId, task.id, ownership.timezone, now);
  const existingOpenSession = await tx.workSession.findFirst({
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    where: { endedAt: null, projectId: task.projectId, taskId: task.id, userId: ownerId },
  });

  if (isIdempotent(state, input.event)) {
    let reconciledSessionId = existingOpenSession?.id ?? null;

    if (state === 'IN_PROGRESS' && !existingOpenSession) {
      if (ownership.archived) return conflict('Archived projects cannot start or change work', false);
      const projectOpenSession = await tx.workSession.findFirst({
        where: { endedAt: null, projectId: task.projectId, userId: ownerId },
      });
      if (projectOpenSession) {
        return conflict(
          'The task state is stale and another task owns the project session',
          true,
          await readTransitionSnapshot({
            client: tx,
            ownerId,
            projectId: task.projectId,
            replacedTaskId: null,
            sessionId: null,
            taskId: task.id,
            today,
          })
        );
      }
      const repairedSession = await tx.workSession.create({
        data: {
          projectId: task.projectId,
          source: 'TIMER',
          startedAt: now,
          taskId: task.id,
          userId: ownerId,
        },
      });
      reconciledSessionId = repairedSession.id;
    } else if (state !== 'IN_PROGRESS' && existingOpenSession) {
      reconciledSessionId = await closeOpenSession({
        now,
        ownerId,
        projectId: task.projectId,
        taskId: task.id,
        tx,
      });
    }

    return {
      data: await readTransitionSnapshot({
        client: tx,
        ownerId,
        projectId: task.projectId,
        replacedTaskId: null,
        sessionId: reconciledSessionId,
        taskId: task.id,
        today,
      }),
      ok: true,
    };
  }

  if (ownership.archived) return conflict('Archived projects cannot start or change work', false);

  let affectedSessionId: string | null = null;
  let replacedTaskId: string | null = null;

  if (input.event === 'START') {
    const projectOpenSession = await tx.workSession.findFirst({
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      where: { endedAt: null, projectId: task.projectId, userId: ownerId },
    });

    if (
      projectOpenSession &&
      projectOpenSession.taskId !== task.id &&
      projectOpenSession.taskId !== expectedOpenTaskId
    ) {
      return conflict(
        'The project changed during this transition',
        true,
        await readTransitionSnapshot({
          client: tx,
          ownerId,
          projectId: task.projectId,
          replacedTaskId: null,
          sessionId: null,
          taskId: task.id,
          today,
        })
      );
    }

    if (projectOpenSession && projectOpenSession.taskId !== task.id) {
      replacedTaskId = projectOpenSession.taskId;
      await closeOpenSession({
        now,
        ownerId,
        projectId: task.projectId,
        taskId: projectOpenSession.taskId,
        tx,
      });
      const replaced = await tx.task.findUnique({ where: { id: projectOpenSession.taskId } });
      if (replaced && !['COMPLETED', 'CANCELLED'].includes(replaced.status)) {
        await tx.task.update({ data: { status: 'PAUSED' }, where: { id: replaced.id } });
      }
    }

    const session = await tx.workSession.create({
      data: {
        projectId: task.projectId,
        source: 'TIMER',
        startedAt: now,
        taskId: task.id,
        userId: ownerId,
      },
    });
    affectedSessionId = session.id;
    await tx.task.update({ data: { status: 'IN_PROGRESS' }, where: { id: task.id } });
  }

  if (input.event === 'PAUSE') {
    affectedSessionId = await closeOpenSession({
      now,
      ownerId,
      projectId: task.projectId,
      taskId: task.id,
      tx,
    });
    await tx.task.update({ data: { status: 'PAUSED' }, where: { id: task.id } });
  }

  if (input.event === 'COMPLETE' || input.event === 'CANCEL') {
    affectedSessionId = await closeOpenSession({
      now,
      ownerId,
      projectId: task.projectId,
      taskId: task.id,
      tx,
    });
    const status: TaskStatus = input.event === 'COMPLETE' ? 'COMPLETED' : 'CANCELLED';
    await tx.task.update({
      data: {
        ...(status === 'COMPLETED' ? { completedAt: now } : { cancelledAt: now }),
        status,
      },
      where: { id: task.id },
    });
    if (today) {
      await tx.dailyPlanItem.update({
        data: { outcome: status },
        where: { userId_taskId_planDate: { planDate: today.date, taskId: task.id, userId: ownerId } },
      });
    }
  }

  const legacyData: Prisma.TaskUpdateInput = {};
  if (input.nextStep !== undefined) {
    legacyData.currentNextStep = input.nextStep || null;
    legacyData.todo = input.nextStep || null;
  }
  if (input.progressNote !== undefined) legacyData.progress = input.progressNote || null;
  if (Object.keys(legacyData).length > 0) {
    await tx.task.update({ data: legacyData, where: { id: task.id } });
  }

  const workLogEntries = [
    input.progressNote ? { content: input.progressNote, kind: 'PROGRESS' as const } : null,
    input.event === 'COMPLETE' && input.completionSummary
      ? { content: input.completionSummary, kind: 'COMPLETION_SUMMARY' as const }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  for (const entry of workLogEntries) {
    await tx.workLogEntry.create({
      data: {
        content: entry.content,
        kind: entry.kind,
        nextStepSnapshot: input.nextStep,
        projectId: task.projectId,
        sessionId: affectedSessionId,
        taskId: task.id,
        userId: ownerId,
      },
    });
  }

  return {
    data: await readTransitionSnapshot({
      client: tx,
      ownerId,
      projectId: task.projectId,
      replacedTaskId,
      sessionId: affectedSessionId,
      taskId: task.id,
      today,
    }),
    ok: true,
  };
};

const executeTransition = async (
  prisma: PrismaClient,
  ownerId: string,
  input: TaskTransitionInput,
  clock: () => Date,
  expectedOpenTaskId: string | null
): Promise<DomainResult<TaskTransitionSnapshot>> =>
  prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<LockedTask[]>`
        SELECT p."id" AS "projectId", p."archived", u."timezone"
        FROM "Task" t
        JOIN "Project" p ON p."id" = t."projectId" AND p."ownerId" = t."userId"
        JOIN "User" u ON u."id" = t."userId"
        WHERE t."id" = ${input.taskId}
          AND t."userId" = ${ownerId}
        FOR UPDATE OF p
      `;
      const ownership = locked[0];
      if (!ownership) return notFound();
      await fenceProject(tx, ownership.projectId);

      return applyTransitionInTransaction({
        expectedOpenTaskId,
        input,
        now: clock(),
        ownerId,
        ownership,
        tx,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

const nestedDatabaseCode = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.code === 'string') return record.code;
  const adapterError = record.driverAdapterError;
  if (typeof adapterError !== 'object' || adapterError === null) return null;
  const cause = (adapterError as Record<string, unknown>).cause;
  if (typeof cause !== 'object' || cause === null) return null;
  const originalCode = (cause as Record<string, unknown>).originalCode;
  return typeof originalCode === 'string' ? originalCode : null;
};

const requestErrorCode = (error: unknown): string | null => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const databaseCode = nestedDatabaseCode(error.meta);
    if (databaseCode === '40001' || databaseCode === '40P01') return 'P2034';
    if (databaseCode === '23505') return 'P2002';
    return error.code;
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    const databaseCode = nestedDatabaseCode(record.meta) ?? (typeof record.code === 'string' ? record.code : null);
    if (databaseCode === '40001' || databaseCode === '40P01') return 'P2034';
    if (databaseCode === '23505') return 'P2002';
    return databaseCode;
  }
  return null;
};

export const isTransitionSerializationError = (error: unknown): boolean => requestErrorCode(error) === 'P2034';

export const runTransitionWithRetry = async <T>({
  execute,
  reconcile,
}: {
  execute: () => Promise<DomainResult<T>>;
  reconcile: () => Promise<DomainResult<T>>;
}): Promise<DomainResult<T>> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      const code = requestErrorCode(error);
      if (code === 'P2034' && attempt === 0) continue;
      if (code === 'P2002') return reconcile();
      if (code === 'P2034') {
        return {
          error: {
            code: 'CONFLICT',
            message: 'The task changed concurrently. Try again.',
            retryable: true,
          },
          ok: false,
        };
      }
      throw error;
    }
  }

  return {
    error: {
      code: 'CONFLICT',
      message: 'The task changed concurrently. Try again.',
      retryable: true,
    },
    ok: false,
  };
};

export const runTodayTransitionWithRetry = async <T>({
  execute,
  reconcile,
}: {
  execute: () => Promise<DomainResult<T>>;
  reconcile: () => Promise<DomainResult<T>>;
}): Promise<DomainResult<T>> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      if (isTransitionSerializationError(error) && attempt === 0) continue;
      if (isTransitionSerializationError(error) || requestErrorCode(error) === 'P2002') return reconcile();
      throw error;
    }
  }

  return reconcile();
};

export const createTaskWithTransition = async ({
  clock = () => new Date(),
  input,
  ownerId,
  prisma,
}: {
  clock?: () => Date;
  input: { progress?: string; startNow: boolean; title: string };
  ownerId: string;
  prisma: PrismaClient;
}): Promise<DomainResult<TaskTransitionSnapshot>> =>
  runTransitionWithRetry({
    execute: () =>
      prisma.$transaction(
        async (tx) => {
          const locked = await tx.$queryRaw<LockedTask[]>`
            SELECT p."id" AS "projectId", p."archived", u."timezone"
            FROM "User" u
            JOIN "Project" p
              ON p."id" = u."currentProjectId"
             AND p."ownerId" = u."id"
            WHERE u."id" = ${ownerId}
            FOR UPDATE OF u, p
          `;
          const ownership = locked[0];
          if (!ownership) return conflict('No active project. Create or select a project first.', false);
          await fenceProject(tx, ownership.projectId);
          if (ownership.archived) return conflict('Archived projects cannot receive new tasks', false);

          const expectedOpenSession = await tx.workSession.findFirst({
            select: { taskId: true },
            where: { endedAt: null, projectId: ownership.projectId, userId: ownerId },
          });
          const task = await tx.task.create({
            data: {
              progress: input.progress || null,
              projectId: ownership.projectId,
              status: 'READY',
              title: input.title,
              userId: ownerId,
            },
          });
          const now = clock();

          if (input.startNow) {
            return applyTransitionInTransaction({
              expectedOpenTaskId: expectedOpenSession?.taskId ?? null,
              input: { event: 'START', progressNote: input.progress, taskId: task.id },
              now,
              ownerId,
              ownership,
              tx,
            });
          }

          if (input.progress) {
            await tx.workLogEntry.create({
              data: {
                content: input.progress,
                kind: 'PROGRESS',
                projectId: task.projectId,
                taskId: task.id,
                userId: ownerId,
              },
            });
          }

          return {
            data: await readTransitionSnapshot({
              client: tx,
              ownerId,
              projectId: task.projectId,
              replacedTaskId: null,
              sessionId: null,
              taskId: task.id,
              today: null,
            }),
            ok: true,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      ),
    reconcile: async () => conflict('Task creation changed concurrently. Try again.', true),
  });

export const reconcileTaskTransition = async ({
  clock = () => new Date(),
  input,
  ownerId,
  prisma,
}: TransitionTaskOptions): Promise<DomainResult<TaskTransitionSnapshot>> =>
  prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<Pick<LockedTask, 'projectId' | 'timezone'>[]>`
        SELECT p."id" AS "projectId", u."timezone"
        FROM "Task" t
        JOIN "Project" p ON p."id" = t."projectId" AND p."ownerId" = t."userId"
        JOIN "User" u ON u."id" = t."userId"
        WHERE t."id" = ${input.taskId}
          AND t."userId" = ${ownerId}
        FOR UPDATE OF p
      `;
      const ownership = locked[0];
      if (!ownership) return notFound();

      const task = await tx.task.findFirst({
        where: { id: input.taskId, projectId: ownership.projectId, userId: ownerId },
      });
      if (!task) return notFound();

      const now = clock();
      const today = await readTodayIfPlanned(tx, ownerId, task.id, ownership.timezone, now);
      const openSession = await tx.workSession.findFirst({
        where: { endedAt: null, projectId: task.projectId, userId: ownerId },
      });
      const snapshot = await readTransitionSnapshot({
        client: tx,
        ownerId,
        projectId: task.projectId,
        replacedTaskId: null,
        sessionId: openSession?.taskId === task.id ? openSession.id : null,
        taskId: task.id,
        today,
      });

      if (
        input.event === 'START' &&
        openSession?.taskId === task.id &&
        normalizeExecutionState(task.status) === 'IN_PROGRESS'
      ) {
        return { data: snapshot, ok: true };
      }

      return conflict('The project changed during this transition', true, snapshot);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
  );

export const transitionTask = async ({
  clock = () => new Date(),
  input,
  ownerId,
  prisma,
}: TransitionTaskOptions): Promise<DomainResult<TaskTransitionSnapshot>> => {
  const initialTask = await prisma.task.findFirst({
    select: { projectId: true },
    where: { id: input.taskId, userId: ownerId },
  });
  if (!initialTask) return notFound();
  const initialOpenSession = await prisma.workSession.findFirst({
    select: { taskId: true },
    where: { endedAt: null, projectId: initialTask.projectId, userId: ownerId },
  });

  return runTransitionWithRetry<TaskTransitionSnapshot>({
    execute: () => executeTransition(prisma, ownerId, input, clock, initialOpenSession?.taskId ?? null),
    reconcile: () => reconcileTaskTransition({ clock, input, ownerId, prisma }),
  });
};

type TransactionTransitionOptions = {
  clock?: () => Date;
  expectedOpenTaskId?: string | null;
  input: TaskTransitionInput;
  ownerId: string;
  planDate?: string;
  tx: Prisma.TransactionClient;
};

/**
 * Applies the canonical task transition using an already-open transaction.
 * Today cockpit commands use this seam so the task, session and selected-date
 * read model share one serializable transaction.
 */
export const transitionTaskInTransaction = async ({
  clock = () => new Date(),
  expectedOpenTaskId,
  input,
  ownerId,
  planDate,
  tx,
}: TransactionTransitionOptions): Promise<DomainResult<TaskTransitionSnapshot>> => {
  const locked = await tx.$queryRaw<LockedTask[]>`
    SELECT p."id" AS "projectId", p."archived", u."timezone"
    FROM "Task" t
    JOIN "Project" p ON p."id" = t."projectId" AND p."ownerId" = t."userId"
    JOIN "User" u ON u."id" = t."userId"
    WHERE t."id" = ${input.taskId}
      AND t."userId" = ${ownerId}
    FOR UPDATE OF p
  `;
  const ownership = locked[0];
  if (!ownership) return notFound();
  await fenceProject(tx, ownership.projectId);
  const expectedOpenSession =
    expectedOpenTaskId === undefined
      ? await tx.workSession.findFirst({
          select: { taskId: true },
          where: { endedAt: null, projectId: ownership.projectId, userId: ownerId },
        })
      : null;

  return applyTransitionInTransaction({
    expectedOpenTaskId: expectedOpenTaskId ?? expectedOpenSession?.taskId ?? null,
    input,
    now: clock(),
    ownerId,
    ownership,
    ...(planDate ? { todayOverride: parsePlanDateKey(planDate) } : {}),
    tx,
  });
};

export const transitionTodayTaskForOwner = async ({
  beforeTransaction,
  clock = () => new Date(),
  input,
  ownerId,
  prisma,
}: {
  /** Test-only coordination hook; safe actions never provide this seam. */
  beforeTransaction?: () => Promise<void>;
  clock?: () => Date;
  input: { planDate: string; transition: TaskTransitionInput };
  ownerId: string;
  prisma: PrismaClient;
}): Promise<DomainResult<TodayViewModel>> => {
  let selectedDate: { date: Date; key: string };
  try {
    selectedDate = parsePlanDateKey(input.planDate);
  } catch (error) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Invalid plan date',
        retryable: false,
      },
      ok: false,
    };
  }

  const initialTask = await prisma.task.findFirst({
    select: { projectId: true },
    where: { id: input.transition.taskId, userId: ownerId },
  });
  if (!initialTask) {
    return { error: { code: 'NOT_FOUND', message: 'Task not found', retryable: false }, ok: false };
  }
  const initialOpenSession = await prisma.workSession.findFirst({
    select: { taskId: true },
    where: { endedAt: null, projectId: initialTask.projectId, userId: ownerId },
  });
  await beforeTransaction?.();

  return runTodayTransitionWithRetry<TodayViewModel>({
    execute: () =>
      prisma.$transaction(
        async (tx) => {
          const owner = await tx.$queryRaw<{ id: string }[]>`
            SELECT "id" FROM "User" WHERE "id" = ${ownerId} FOR UPDATE
          `;
          if (owner.length === 0) {
            return {
              error: { code: 'NOT_FOUND' as const, message: 'Today owner not found', retryable: false },
              ok: false as const,
            };
          }

          await tx.user.update({ data: { todayRevision: { increment: 1 } }, where: { id: ownerId } });

          const result = await transitionTaskInTransaction({
            clock,
            expectedOpenTaskId: initialOpenSession?.taskId ?? null,
            input: input.transition,
            ownerId,
            planDate: selectedDate.key,
            tx,
          });
          if (!result.ok) {
            const canonical = result.canonical
              ? await readTodayForOwner({ clock, ownerId, planDate: selectedDate.key, prisma: tx })
              : undefined;
            return { error: result.error, ok: false as const, ...(canonical ? { canonical } : {}) };
          }
          return {
            data: await readTodayForOwner({ clock, ownerId, planDate: selectedDate.key, prisma: tx }),
            ok: true as const,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      ),
    reconcile: async () => ({
      canonical: await readTodayForOwner({ clock, ownerId, planDate: selectedDate.key, prisma }),
      error: { code: 'CONFLICT' as const, message: 'The Today plan changed concurrently. Try again.', retryable: true },
      ok: false as const,
    }),
  });
};

type ArchiveProjectResult = DomainResult<{ archived: true; projectId: string }>;

export const archiveOwnedProject = async ({
  clock = () => new Date(),
  ownerId,
  prisma,
  projectId,
}: {
  clock?: () => Date;
  ownerId: string;
  prisma: PrismaClient;
  projectId: string;
}): Promise<ArchiveProjectResult> =>
  runTransitionWithRetry({
    execute: () =>
      prisma.$transaction(
        async (tx): Promise<ArchiveProjectResult> => {
          const locked = await tx.$queryRaw<{ id: string }[]>`
            SELECT "id"
            FROM "Project"
            WHERE "id" = ${projectId} AND "ownerId" = ${ownerId}
            FOR UPDATE
          `;
          if (!locked[0]) {
            return {
              error: { code: 'NOT_FOUND', message: 'Project not found', retryable: false },
              ok: false,
            };
          }
          const openSession = await tx.workSession.findFirst({
            select: { id: true },
            where: { endedAt: null, projectId, userId: ownerId },
          });
          if (openSession) {
            return {
              error: { code: 'CONFLICT', message: 'Pause active work before archiving', retryable: false },
              ok: false,
            };
          }
          await tx.project.update({
            data: { archived: true, archivedAt: clock() },
            where: { id: projectId },
          });
          return { data: { archived: true, projectId }, ok: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      ),
    reconcile: async () => ({
      error: { code: 'CONFLICT', message: 'The project changed during archival', retryable: true },
      ok: false,
    }),
  });
