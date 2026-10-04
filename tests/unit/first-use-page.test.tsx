import Dashboard from '../../src/app/dashboard/page';
import FirstUseToday from '../../src/components/onboarding/FirstUseToday';
import { validateUserToken } from '../../src/helpers/validate-user';
import { readAccountProfileForOwner } from '../../src/server/account/account-preferences';
import { readFirstUseForOwner } from '../../src/server/account/read-first-use';
import { readTodayForOwner } from '../../src/server/today/read-today';

jest.mock('../../src/helpers/validate-user', () => ({ validateUserToken: jest.fn() }));
jest.mock('../../src/server/account/account-preferences', () => ({ readAccountProfileForOwner: jest.fn() }));
jest.mock('../../src/server/account/read-first-use', () => ({ readFirstUseForOwner: jest.fn() }));
jest.mock('../../src/server/today/read-today', () => ({ readTodayForOwner: jest.fn() }));
jest.mock('../../src/lib/db', () => ({ __esModule: true, default: {} }));
jest.mock('../../src/components/onboarding/FirstUseToday', () => ({ __esModule: true, default: () => null }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(validateUserToken).mockResolvedValue({ id: 'owner' });
  jest.mocked(readAccountProfileForOwner).mockResolvedValue({ id: 'owner', timezone: 'UTC' } as never);
  jest.mocked(readTodayForOwner).mockResolvedValue({ projects: [] } as never);
  jest.mocked(readFirstUseForOwner).mockResolvedValue({ activeProjectCount: 0, archivedProjectCount: 2, taskCount: 3 });
});
it('passes authoritative owned setup state, profile and Today to the guide after authentication', async () => {
  const page = await Dashboard();
  expect(page.type).toBe(FirstUseToday);
  expect(page.props).toMatchObject({
    initialToday: { projects: [] },
    profile: { id: 'owner', timezone: 'UTC' },
    firstUse: { activeProjectCount: 0, archivedProjectCount: 2, taskCount: 3 },
  });
  for (const reader of [readTodayForOwner, readFirstUseForOwner, readAccountProfileForOwner]) {
    expect(reader).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'owner' }));
    expect(jest.mocked(validateUserToken).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(reader).mock.invocationCallOrder[0]
    );
  }
});
it('never reads setup data for unauthenticated requests', async () => {
  jest.mocked(validateUserToken).mockRejectedValue(new Error('Session ended'));
  await expect(Dashboard()).rejects.toThrow('Session ended');
  expect(readFirstUseForOwner).not.toHaveBeenCalled();
  expect(readAccountProfileForOwner).not.toHaveBeenCalled();
});
