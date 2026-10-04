import { notFound } from 'next/navigation';

import SettingsLayout from '../../src/app/settings/layout';
import SettingsPage, { metadata } from '../../src/app/settings/page';
import DashboardShell from '../../src/components/dashboard/DashboardShell';
import { validateUserToken } from '../../src/helpers/validate-user';
import db from '../../src/lib/db';
import { readAccountProfileForOwner } from '../../src/server/account/account-preferences';

jest.mock('../../src/helpers/validate-user', () => ({ validateUserToken: jest.fn() }));
jest.mock('../../src/server/account/account-preferences', () => ({ readAccountProfileForOwner: jest.fn() }));
jest.mock('../../src/lib/db', () => ({ __esModule: true, default: {} }));
jest.mock('../../src/components/settings/SettingsView', () => ({ __esModule: true, default: () => null }));
jest.mock('../../src/components/dashboard/DashboardShell', () => ({ __esModule: true, default: () => null }));
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));
const profile = {
  id: 'owner',
  name: 'Owner',
  email: 'owner@example.test',
  currentProjectId: null,
  currentProject: null,
  timezone: 'Pacific/Honolulu',
  weekStartDay: 'SATURDAY' as const,
  dailyCapacityMinutes: 0,
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(validateUserToken).mockResolvedValue({ id: 'owner' });
  jest.mocked(readAccountProfileForOwner).mockResolvedValue(profile);
});
it('authenticates before reading an authoritative safe owner profile', async () => {
  expect((await SettingsPage()).props.profile).toEqual(profile);
  expect(readAccountProfileForOwner).toHaveBeenCalledWith({ prisma: db, ownerId: 'owner' });
  expect(jest.mocked(validateUserToken).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(readAccountProfileForOwner).mock.invocationCallOrder[0]
  );
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
it('never reads preferences when authentication fails', async () => {
  jest.mocked(validateUserToken).mockRejectedValue(new Error('NEXT_REDIRECT'));
  await expect(SettingsPage()).rejects.toThrow('NEXT_REDIRECT');
  expect(readAccountProfileForOwner).not.toHaveBeenCalled();
});
it('uses private not found for a deleted owner', async () => {
  jest.mocked(readAccountProfileForOwner).mockResolvedValue(null);
  await expect(SettingsPage()).rejects.toThrow('NOT_FOUND');
  expect(notFound).toHaveBeenCalled();
});
it('uses the existing dashboard shell without adding another main', () => {
  expect(SettingsLayout({ children: 'Settings' }).type).toBe(DashboardShell);
});
