import type { PrismaClient } from '../../generated/prisma/client';
import { settingsSchema } from '../../src/schema/user';
import {
  readAccountProfileForOwner,
  updateAccountPreferencesForOwner,
} from '../../src/server/account/account-preferences';

const profile = {
  id: 'owner',
  name: 'Owner',
  email: 'owner@example.test',
  currentProjectId: null,
  currentProject: null,
  weekStartDay: 'MONDAY' as const,
  timezone: 'Africa/Cairo',
  dailyCapacityMinutes: 60,
};
const fixture = () => {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'owner' }]),
    user: {
      findUnique: jest.fn().mockResolvedValue(profile),
      update: jest.fn().mockResolvedValue({ ...profile, weekStartDay: 'SUNDAY' }),
    },
  };
  const prisma = { user: tx.user, $transaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaClient;
  return { prisma, tx };
};
describe('account preference validation', () => {
  it.each([
    {},
    { timezone: 'Not/AZone' },
    { timezone: '+02:00' },
    { weekStartDay: 'FRIDAY' },
    { dailyCapacityMinutes: -1 },
    { dailyCapacityMinutes: 0.5 },
    { dailyCapacityMinutes: 1441 },
    { dailyCapacityMinutes: '' },
    { weekStartDay: undefined },
  ])('rejects %j', (input) => {
    expect(settingsSchema.safeParse(input).success).toBe(false);
  });
  it.each(['SUNDAY', 'MONDAY', 'SATURDAY'])('accepts %s without defaulting other fields', (weekStartDay) => {
    expect(settingsSchema.parse({ weekStartDay })).toEqual({ weekStartDay });
  });
  it.each([null, 0, 1440])('accepts capacity %s', (dailyCapacityMinutes) => {
    expect(settingsSchema.parse({ dailyCapacityMinutes })).toEqual({ dailyCapacityMinutes });
  });
  it('accepts an explicit IANA zone', () =>
    expect(settingsSchema.parse({ timezone: 'Pacific/Honolulu' })).toEqual({ timezone: 'Pacific/Honolulu' }));
});
describe('owner scoped preferences', () => {
  it('reads by owner ID with a safe select', async () => {
    const { prisma, tx } = fixture();
    expect(await readAccountProfileForOwner({ prisma, ownerId: 'owner' })).toEqual(profile);
    expect(tx.user.findUnique.mock.calls[0][0].where).toEqual({ id: 'owner' });
  });
  it('locks the owner and updates only supplied preferences with one revision increment', async () => {
    const { prisma, tx } = fixture();
    await updateAccountPreferencesForOwner({ prisma, ownerId: 'owner', input: { weekStartDay: 'SUNDAY' } });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'owner' },
        data: { weekStartDay: 'SUNDAY', todayRevision: { increment: 1 } },
      })
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('does not write or increment revision for unchanged preferences', async () => {
    const { prisma, tx } = fixture();
    expect(
      await updateAccountPreferencesForOwner({ prisma, ownerId: 'owner', input: { timezone: profile.timezone } })
    ).toEqual(profile);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('rejects a nonexistent owner without mutating any user', async () => {
    const { prisma, tx } = fixture();
    tx.user.findUnique.mockResolvedValue(null);
    await expect(
      updateAccountPreferencesForOwner({ prisma, ownerId: 'foreign', input: { timezone: 'UTC' } })
    ).rejects.toThrow();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('validates even direct service callers before opening a transaction', async () => {
    const { prisma } = fixture();
    await expect(updateAccountPreferencesForOwner({ prisma, ownerId: 'owner', input: {} })).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
