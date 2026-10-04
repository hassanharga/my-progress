import type { PrismaClient } from '../../generated/prisma/client';
import {
  readAccountProfileForOwner,
  updateAccountPreferencesForOwner,
} from '../../src/server/account/account-preferences';
import { saveFirstUseTimezoneForOwner } from '../../src/server/account/save-first-use-timezone';
import { readTodayForOwner } from '../../src/server/today/read-today';

jest.mock('../../src/server/account/account-preferences', () => ({
  readAccountProfileForOwner: jest.fn(),
  updateAccountPreferencesForOwner: jest.fn(),
}));
jest.mock('../../src/server/today/read-today', () => ({ readTodayForOwner: jest.fn() }));
const profile = { id: 'owner', timezone: 'Pacific/Honolulu', dailyCapacityMinutes: 0 };
const today = { timezone: 'Pacific/Honolulu', planDate: '2026-10-03', workload: { capacityMinutes: 0 } };
const tx = {};
const prisma = { $transaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaClient;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(updateAccountPreferencesForOwner).mockResolvedValue(profile as never);
  jest.mocked(readAccountProfileForOwner).mockResolvedValue(profile as never);
  jest.mocked(readTodayForOwner).mockResolvedValue(today as never);
});
it('writes only an explicit timezone then reads profile and Today from one consistent transaction without a browser date', async () => {
  expect(
    await saveFirstUseTimezoneForOwner({ prisma, ownerId: 'owner', input: { timezone: 'Pacific/Honolulu' } })
  ).toEqual({ ok: true, data: { profile, today } });
  expect(updateAccountPreferencesForOwner).toHaveBeenCalledWith({
    prisma,
    ownerId: 'owner',
    input: { timezone: 'Pacific/Honolulu' },
  });
  expect(readAccountProfileForOwner).toHaveBeenCalledWith({ prisma: tx, ownerId: 'owner' });
  expect(readTodayForOwner).toHaveBeenCalledWith({ prisma: tx, ownerId: 'owner' });
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
});
it.each(['Not/AZone', '+02:00', ''])('rejects invalid zone %s without saving', async (timezone) => {
  expect(await saveFirstUseTimezoneForOwner({ prisma, ownerId: 'owner', input: { timezone } })).toMatchObject({
    ok: false,
    error: { code: 'VALIDATION_ERROR', retryable: false },
  });
  expect(updateAccountPreferencesForOwner).not.toHaveBeenCalled();
});
it('does not report success after a possible save followed by failed canonical readback; repeating reconciles', async () => {
  jest.mocked(readTodayForOwner).mockRejectedValueOnce(new Error('private database details'));
  const options = { prisma, ownerId: 'owner', input: { timezone: 'Pacific/Honolulu' } };
  const failed = await saveFirstUseTimezoneForOwner(options);
  expect(failed).toMatchObject({ ok: false, error: { retryable: true } });
  expect(JSON.stringify(failed)).not.toContain('private database details');
  expect(await saveFirstUseTimezoneForOwner(options)).toEqual({ ok: true, data: { profile, today } });
  expect(updateAccountPreferencesForOwner).toHaveBeenCalledTimes(2);
});
it('does not return a successful pair when the owner disappears', async () => {
  jest.mocked(readAccountProfileForOwner).mockResolvedValue(null);
  expect(await saveFirstUseTimezoneForOwner({ prisma, ownerId: 'owner', input: { timezone: 'UTC' } })).toMatchObject({
    ok: false,
    error: { code: 'NOT_FOUND', retryable: false },
  });
});
