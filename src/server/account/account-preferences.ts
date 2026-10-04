import { settingsSchema, type SettingsInput } from '@/schema/user';

import type { AccountProfile } from '@/types/user';

import type { Prisma, PrismaClient } from '../../../generated/prisma/client';
import { accountProfileSelect, toAccountProfile } from './account-profile';

export const readAccountProfileForOwner = async ({
  prisma,
  ownerId,
}: {
  prisma: PrismaClient | Prisma.TransactionClient;
  ownerId: string;
}): Promise<AccountProfile | null> => {
  const profile = await prisma.user.findUnique({ where: { id: ownerId }, select: accountProfileSelect });
  return profile ? toAccountProfile(profile) : null;
};

export const updateAccountPreferencesForOwner = async ({
  prisma,
  ownerId,
  input,
}: {
  prisma: PrismaClient;
  ownerId: string;
  input: SettingsInput;
}): Promise<AccountProfile> => {
  const patch = settingsSchema.parse(input);
  return prisma.$transaction(
    async (tx) => {
      // Share the owner lock with Today mutations before changing their grouping inputs.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${ownerId} FOR UPDATE`;
      const profile = await tx.user.findUnique({ where: { id: ownerId }, select: accountProfileSelect });
      if (!profile) throw new Error('Account unavailable.');
      const changed = (['weekStartDay', 'timezone', 'dailyCapacityMinutes'] as const).some(
        (key) => patch[key] !== undefined && patch[key] !== profile[key]
      );
      if (!changed) return toAccountProfile(profile);
      const data = {
        ...(patch.weekStartDay !== undefined ? { weekStartDay: patch.weekStartDay } : {}),
        ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
        ...(patch.dailyCapacityMinutes !== undefined ? { dailyCapacityMinutes: patch.dailyCapacityMinutes } : {}),
        todayRevision: { increment: 1 },
      };
      return toAccountProfile(await tx.user.update({ where: { id: ownerId }, data, select: accountProfileSelect }));
    },
    { isolationLevel: 'Serializable' }
  );
};
