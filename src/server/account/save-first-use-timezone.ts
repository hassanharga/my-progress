import type { PrismaClient } from '../../../generated/prisma/client';
import { firstUseTimezoneSchema } from '../../schema/user';
import type { AccountProfile } from '../../types/user';
import type { DomainResult } from '../tasks/task-transition-types';
import { readTodayForOwner } from '../today/read-today';
import type { TodayViewModel } from '../today/today-types';
import { readAccountProfileForOwner, updateAccountPreferencesForOwner } from './account-preferences';

export const saveFirstUseTimezoneForOwner = async ({
  prisma,
  ownerId,
  input,
}: {
  prisma: PrismaClient;
  ownerId: string;
  input: { timezone: string };
}): Promise<DomainResult<{ profile: AccountProfile; today: TodayViewModel }>> => {
  const parsed = firstUseTimezoneSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Choose a valid IANA timezone.', retryable: false },
    };
  try {
    await updateAccountPreferencesForOwner({ prisma, ownerId, input: parsed.data });
    return await prisma.$transaction(
      async (tx) => {
        const profile = await readAccountProfileForOwner({ prisma: tx, ownerId });
        if (!profile)
          return {
            ok: false as const,
            error: { code: 'NOT_FOUND' as const, message: 'Account unavailable.', retryable: false },
          };
        const today = await readTodayForOwner({ prisma: tx, ownerId });
        return { ok: true as const, data: { profile, today } };
      },
      { isolationLevel: 'RepeatableRead' }
    );
  } catch {
    return {
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Could not confirm your timezone and daily plan. Retry the same timezone to check the saved result.',
        retryable: true,
      },
    };
  }
};
