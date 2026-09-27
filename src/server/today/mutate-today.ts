import { createHash } from 'node:crypto';

import { Prisma, type PrismaClient } from '../../../generated/prisma/client';
import { createTodayTaskInputSchema, type CreateTodayTaskInput, type TodayMutationInput } from '../../schema/today';
import { normalizeExecutionState } from '../tasks/task-queries';
import type { DomainResult } from '../tasks/task-transition-types';
import { isTransitionSerializationError, transitionTaskInTransaction } from '../tasks/transition-task';
import { parsePlanDateKey } from './plan-date';
import { readTodayForOwner } from './read-today';
import type { TodayViewModel } from './today-types';

type TodayMutationOptions = {
  /** Test-only coordination hook; safe actions never provide this seam. */
  afterOwnerLock?: () => Promise<void>;
  /** Test-only coordination hook; safe actions never provide this seam. */
  beforeTransaction?: () => Promise<void>;
  clock?: () => Date;
  input: TodayMutationInput;
  ownerId: string;
  prisma: PrismaClient;
};

const ACTIVE_OUTCOMES = ['OPEN', 'COMPLETED', 'CANCELLED'] as const;

const errorResult = <T>(
  code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_ERROR',
  message: string,
  retryable = false
): DomainResult<T> => ({ error: { code, message, retryable }, ok: false });

const invalidDate = (message: string): DomainResult<TodayViewModel> => errorResult('VALIDATION_ERROR', message);

const todayCreateKind = 'CREATE_TODAY_TASK';

class AtomicTodayTaskFailure extends Error {
  constructor(readonly result: DomainResult<TodayViewModel>) {
    super(result.ok ? 'Today task creation failed' : result.error.message);
  }
}

const validateMutationValues = (input: TodayMutationInput): string | null => {
  const minutes = 'plannedMinutes' in input ? input.plannedMinutes : null;
  if (minutes !== undefined && minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)) {
    return 'Planned minutes must be between 1 and 1440';
  }
  if (
    input.type === 'MOVE' &&
    input.position !== undefined &&
    (!Number.isInteger(input.position) || input.position < 0)
  ) {
    return 'Move position must be a non-negative integer';
  }
  return null;
};

const normalizeDate = (key: string): Date => parsePlanDateKey(key).date;

const activeItems = async (tx: Prisma.TransactionClient, ownerId: string, planDate: Date) =>
  tx.dailyPlanItem.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    where: { outcome: { in: [...ACTIVE_OUTCOMES] }, planDate, userId: ownerId },
  });

const compact = async (tx: Prisma.TransactionClient, ownerId: string, planDate: Date): Promise<void> => {
  const rows = await activeItems(tx, ownerId, planDate);
  for (const [position, row] of rows.entries()) {
    if (row.position !== position) {
      await tx.dailyPlanItem.update({ data: { position }, where: { id: row.id } });
    }
  }
};

const appendPosition = async (tx: Prisma.TransactionClient, ownerId: string, planDate: Date): Promise<number> =>
  (await activeItems(tx, ownerId, planDate)).length;

const taskExistsForOwner = async (
  tx: Prisma.TransactionClient,
  ownerId: string,
  taskId: string
): Promise<{
  Project: { archived: boolean };
  id: string;
  projectId: string;
  status: Parameters<typeof normalizeExecutionState>[0];
} | null> =>
  tx.task.findFirst({
    select: { id: true, projectId: true, status: true, Project: { select: { archived: true } } },
    where: { id: taskId, userId: ownerId },
  });

const findMembership = async (tx: Prisma.TransactionClient, ownerId: string, taskId: string, planDate: Date) =>
  tx.dailyPlanItem.findUnique({ where: { userId_taskId_planDate: { planDate, taskId, userId: ownerId } } });

const canonical = (
  tx: Prisma.TransactionClient | PrismaClient,
  ownerId: string,
  planDate: string,
  clock?: () => Date
) => readTodayForOwner({ clock, ownerId, planDate, prisma: tx });

const applyMutation = async (
  tx: Prisma.TransactionClient,
  ownerId: string,
  input: TodayMutationInput,
  clock?: () => Date
): Promise<DomainResult<TodayViewModel>> => {
  const selectedDate = normalizeDate(input.planDate);
  const viewPlanDate = 'viewPlanDate' in input && input.viewPlanDate ? input.viewPlanDate : input.planDate;
  const orderedDateKeys = [
    input.planDate,
    ...(input.type === 'MOVE_TO_DATE' ? [input.targetPlanDate] : []),
    ...(input.type === 'KEEP_TODAY' ? [input.sourcePlanDate] : []),
  ].sort();
  for (const dateKey of orderedDateKeys) {
    await activeItems(tx, ownerId, normalizeDate(dateKey));
  }
  const task = await taskExistsForOwner(tx, ownerId, input.taskId);
  if (!task) return errorResult('NOT_FOUND', 'Task not found');

  if (input.type === 'ADD' && task.Project.archived) {
    return errorResult('VALIDATION_ERROR', 'Archived projects cannot receive Today items');
  }

  const existing = await findMembership(tx, ownerId, input.taskId, selectedDate);
  if (input.type === 'ADD') {
    if (!existing) {
      await compact(tx, ownerId, selectedDate);
      await tx.dailyPlanItem.create({
        data: {
          planDate: selectedDate,
          plannedMinutes: input.plannedMinutes ?? null,
          position: await appendPosition(tx, ownerId, selectedDate),
          projectId: task.projectId,
          taskId: input.taskId,
          userId: ownerId,
        },
      });
    } else if (existing.outcome === 'RETURNED_TO_BACKLOG' || existing.outcome === 'CARRIED') {
      await compact(tx, ownerId, selectedDate);
      await tx.dailyPlanItem.update({
        data: {
          outcome: 'OPEN',
          plannedMinutes: input.plannedMinutes ?? null,
          position: await appendPosition(tx, ownerId, selectedDate),
        },
        where: { id: existing.id },
      });
    }
  } else if (input.type === 'SET_PLANNED_MINUTES' || input.type === 'UPDATE_PLANNED_MINUTES') {
    if (!existing) return errorResult('NOT_FOUND', 'Task is not planned for this date');
    await tx.dailyPlanItem.update({ data: { plannedMinutes: input.plannedMinutes }, where: { id: existing.id } });
  } else if (input.type === 'MOVE') {
    if (!existing) return errorResult('NOT_FOUND', 'Task is not planned for this date');
    const rows = await activeItems(tx, ownerId, selectedDate);
    const currentIndex = rows.findIndex(({ id }) => id === existing.id);
    if (currentIndex < 0) return errorResult('NOT_FOUND', 'Task is not actively planned for this date');
    const requested = input.position ?? (input.direction === 'UP' ? currentIndex - 1 : currentIndex + 1);
    const nextIndex = Math.max(0, Math.min(rows.length - 1, requested));
    const reordered = [...rows];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    for (const [position, row] of reordered.entries()) {
      if (row.position !== position) await tx.dailyPlanItem.update({ data: { position }, where: { id: row.id } });
    }
  } else if (input.type === 'REMOVE' || input.type === 'RETURN_TO_BACKLOG') {
    if (existing?.outcome === 'OPEN') {
      await tx.dailyPlanItem.update({ data: { outcome: 'RETURNED_TO_BACKLOG' }, where: { id: existing.id } });
      await compact(tx, ownerId, selectedDate);
    }
  } else if (input.type === 'MOVE_TO_DATE') {
    const targetDate = normalizeDate(input.targetPlanDate);
    if (targetDate.getTime() !== selectedDate.getTime()) {
      const target = await findMembership(tx, ownerId, input.taskId, targetDate);
      if (!existing) {
        if (target) return { data: await canonical(tx, ownerId, viewPlanDate, clock), ok: true };
        return errorResult('NOT_FOUND', 'Task is not planned for this date');
      }
      if (existing.outcome === 'OPEN') {
        if (target) {
          await tx.dailyPlanItem.delete({ where: { id: existing.id } });
          await compact(tx, ownerId, selectedDate);
        } else {
          await tx.dailyPlanItem.update({
            data: { planDate: targetDate, position: await appendPosition(tx, ownerId, targetDate) },
            where: { id: existing.id },
          });
          await compact(tx, ownerId, selectedDate);
        }
      }
    }
  } else if (input.type === 'KEEP_TODAY') {
    const sourceDate = normalizeDate(input.sourcePlanDate);
    if (input.sourcePlanDate >= input.planDate) {
      return errorResult('VALIDATION_ERROR', 'KEEP_TODAY requires a prior source date');
    }
    const source = await findMembership(tx, ownerId, input.taskId, sourceDate);
    if (!source) return errorResult('NOT_FOUND', 'Unfinished source item not found');
    if (source.outcome === 'CARRIED') return { data: await canonical(tx, ownerId, viewPlanDate, clock), ok: true };
    if (task.Project.archived) return errorResult('VALIDATION_ERROR', 'Archived projects cannot receive Today items');
    if (normalizeExecutionState(task.status) === 'COMPLETED' || normalizeExecutionState(task.status) === 'CANCELLED') {
      return errorResult('VALIDATION_ERROR', 'Terminal tasks cannot be carried to Today');
    }
    if (source.outcome !== 'OPEN') return errorResult('VALIDATION_ERROR', 'Only open source items can be carried');

    const target = await findMembership(tx, ownerId, input.taskId, selectedDate);
    if (!target) {
      await tx.dailyPlanItem.create({
        data: {
          planDate: selectedDate,
          plannedMinutes: source.plannedMinutes,
          position: await appendPosition(tx, ownerId, selectedDate),
          projectId: source.projectId,
          taskId: source.taskId,
          userId: ownerId,
        },
      });
    }
    await tx.dailyPlanItem.update({ data: { outcome: 'CARRIED' }, where: { id: source.id } });
    await compact(tx, ownerId, sourceDate);
  }

  return { data: await canonical(tx, ownerId, viewPlanDate, clock), ok: true };
};

const lockOwner = async (tx: Prisma.TransactionClient, ownerId: string): Promise<boolean> => {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "User" WHERE "id" = ${ownerId} FOR UPDATE
  `;
  return rows.length > 0;
};

export const runTodayMutationWithRetry = async <T>({
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
      if (isTransitionSerializationError(error)) return reconcile();
      throw error;
    }
  }
  return reconcile();
};

export const mutateTodayForOwner = async ({
  afterOwnerLock,
  beforeTransaction,
  clock = () => new Date(),
  input,
  ownerId,
  prisma,
}: TodayMutationOptions): Promise<DomainResult<TodayViewModel>> => {
  try {
    parsePlanDateKey(input.planDate);
    if (input.type === 'MOVE_TO_DATE') parsePlanDateKey(input.targetPlanDate);
    if (input.type === 'KEEP_TODAY') parsePlanDateKey(input.sourcePlanDate);
    if ('viewPlanDate' in input && input.viewPlanDate) parsePlanDateKey(input.viewPlanDate);
  } catch (error) {
    return invalidDate(error instanceof Error ? error.message : 'Invalid plan date');
  }
  const invalidValue = validateMutationValues(input);
  if (invalidValue) return invalidDate(invalidValue);
  await beforeTransaction?.();

  return runTodayMutationWithRetry({
    execute: () =>
      prisma.$transaction(
        async (tx) => {
          if (!(await lockOwner(tx, ownerId))) return errorResult('NOT_FOUND', 'Today owner not found');
          await afterOwnerLock?.();
          await tx.user.update({ data: { todayRevision: { increment: 1 } }, where: { id: ownerId } });
          return applyMutation(tx, ownerId, input, clock);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      ),
    reconcile: async () => ({
      canonical: await canonical(
        prisma,
        ownerId,
        'viewPlanDate' in input && input.viewPlanDate ? input.viewPlanDate : input.planDate,
        clock
      ),
      error: { code: 'CONFLICT' as const, message: 'The Today plan changed concurrently. Try again.', retryable: true },
      ok: false as const,
    }),
  });
};

const stableTodayCreatePayload = (input: CreateTodayTaskInput, planDate: string): string =>
  JSON.stringify({
    description: input.description?.trim() ?? '',
    planDate,
    plannedMinutes: input.plannedMinutes ?? null,
    projectId: input.projectId,
    startNow: input.startNow,
    title: input.title.trim(),
  });

const hashTodayCreatePayload = (input: CreateTodayTaskInput, planDate: string): string =>
  createHash('sha256').update(stableTodayCreatePayload(input, planDate)).digest('hex');

export const createTodayTaskForOwner = async ({
  afterStage,
  clock = () => new Date(),
  input,
  ownerId,
  prisma,
}: {
  /** Test-only rollback hook; safe actions never provide this seam. */
  afterStage?: (stage: 'PLAN_CREATED' | 'TRANSITION_APPLIED' | 'RECEIPT_CREATED') => Promise<void>;
  clock?: () => Date;
  input: CreateTodayTaskInput;
  ownerId: string;
  prisma: PrismaClient;
}): Promise<DomainResult<TodayViewModel>> => {
  const parsed = createTodayTaskInputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidDate(parsed.error.issues[0]?.message ?? 'Invalid Today task input');
  }

  let selectedDate: { date: Date; key: string };
  try {
    selectedDate = parsePlanDateKey(parsed.data.planDate);
  } catch (error) {
    return invalidDate(error instanceof Error ? error.message : 'Invalid plan date');
  }

  const normalizedInput = parsed.data;
  const payloadHash = hashTodayCreatePayload(normalizedInput, selectedDate.key);

  try {
    return await runTodayMutationWithRetry({
      execute: () =>
        prisma.$transaction(
          async (tx) => {
            if (!(await lockOwner(tx, ownerId))) return errorResult('NOT_FOUND', 'Today owner not found');
            await tx.user.update({ data: { todayRevision: { increment: 1 } }, where: { id: ownerId } });

            const receipt = await tx.todayMutationReceipt.findUnique({
              where: { userId_requestId: { requestId: normalizedInput.requestId, userId: ownerId } },
            });
            if (receipt) {
              if (receipt.payloadHash !== payloadHash) {
                return errorResult('VALIDATION_ERROR', 'Request id was already used with a different payload');
              }
              return { data: await canonical(tx, ownerId, selectedDate.key, clock), ok: true };
            }

            const project = await tx.project.findFirst({
              select: { archived: true, id: true },
              where: { id: normalizedInput.projectId, ownerId },
            });
            if (!project) return errorResult('VALIDATION_ERROR', 'Project not found');
            if (project.archived) return errorResult('VALIDATION_ERROR', 'Archived projects cannot receive new tasks');

            await compact(tx, ownerId, selectedDate.date);
            const task = await tx.task.create({
              data: {
                description: normalizedInput.description || null,
                projectId: project.id,
                status: 'READY',
                title: normalizedInput.title.trim(),
                userId: ownerId,
              },
            });
            await tx.dailyPlanItem.create({
              data: {
                planDate: selectedDate.date,
                plannedMinutes: normalizedInput.plannedMinutes ?? null,
                position: await appendPosition(tx, ownerId, selectedDate.date),
                projectId: project.id,
                taskId: task.id,
                userId: ownerId,
              },
            });
            await afterStage?.('PLAN_CREATED');

            if (normalizedInput.startNow) {
              const transition = await transitionTaskInTransaction({
                clock,
                input: { event: 'START', taskId: task.id },
                ownerId,
                planDate: selectedDate.key,
                tx,
              });
              if (!transition.ok) {
                throw new AtomicTodayTaskFailure({
                  error: transition.error,
                  ok: false,
                  ...(transition.canonical ? { canonical: await canonical(tx, ownerId, selectedDate.key, clock) } : {}),
                });
              }
              await afterStage?.('TRANSITION_APPLIED');
            }

            await tx.todayMutationReceipt.create({
              data: {
                kind: todayCreateKind,
                payloadHash,
                requestId: normalizedInput.requestId,
                taskId: task.id,
                userId: ownerId,
              },
            });
            await afterStage?.('RECEIPT_CREATED');
            return { data: await canonical(tx, ownerId, selectedDate.key, clock), ok: true };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        ),
      reconcile: async () => {
        const receipt = await prisma.todayMutationReceipt.findUnique({
          where: { userId_requestId: { requestId: normalizedInput.requestId, userId: ownerId } },
        });
        if (!receipt) {
          return {
            error: {
              code: 'CONFLICT' as const,
              message: 'Today task creation changed concurrently. Try again.',
              retryable: true,
            },
            ok: false as const,
          };
        }
        if (receipt.payloadHash !== payloadHash) {
          return errorResult('VALIDATION_ERROR', 'Request id was already used with a different payload');
        }
        return { data: await canonical(prisma, ownerId, selectedDate.key, clock), ok: true };
      },
    });
  } catch (error) {
    if (error instanceof AtomicTodayTaskFailure) return error.result;
    throw error;
  }
};
