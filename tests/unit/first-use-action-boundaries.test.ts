import { revalidatePath } from 'next/cache';

import { createFirstProject } from '../../src/actions/project';
import { saveFirstUseTimezone } from '../../src/actions/user';
import { validateUserToken } from '../../src/helpers/validate-user';
import db from '../../src/lib/db';
import { createFirstProjectForOwner } from '../../src/server/account/create-first-project';
import { saveFirstUseTimezoneForOwner } from '../../src/server/account/save-first-use-timezone';

jest.mock('../../src/helpers/validate-user', () => ({ validateUserToken: jest.fn() }));
jest.mock('../../src/lib/db', () => ({ __esModule: true, default: {} }));
jest.mock('../../src/server/account/create-first-project', () => ({ createFirstProjectForOwner: jest.fn() }));
jest.mock('../../src/server/account/save-first-use-timezone', () => ({ saveFirstUseTimezoneForOwner: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ logger: { error: jest.fn() } }));
const projectInput = { projectId: 'b7152df8-bbc4-4210-9fa9-7c6f031e2602', name: 'My project' };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(validateUserToken).mockResolvedValue({ id: 'owner' });
  jest.mocked(createFirstProjectForOwner).mockResolvedValue({ ok: true, data: {} } as never);
  jest.mocked(saveFirstUseTimezoneForOwner).mockResolvedValue({ ok: true, data: {} } as never);
});
it('authenticates first project and ignores an injected owner', async () => {
  await createFirstProject({ ...projectInput, ownerId: 'foreign' } as never);
  expect(createFirstProjectForOwner).toHaveBeenCalledWith({ prisma: db, ownerId: 'owner', input: projectInput });
  expect(jest.mocked(revalidatePath).mock.calls.map(([path]) => path)).toEqual([
    '/dashboard',
    '/projects',
    '/settings',
  ]);
});
it('authenticates timezone and invalidates its grouping consumers', async () => {
  await saveFirstUseTimezone({ timezone: 'UTC', ownerId: 'foreign' } as never);
  expect(saveFirstUseTimezoneForOwner).toHaveBeenCalledWith({
    prisma: db,
    ownerId: 'owner',
    input: { timezone: 'UTC' },
  });
  expect(jest.mocked(revalidatePath).mock.calls.map(([path]) => path)).toEqual([
    '/settings',
    '/dashboard',
    '/projects',
    '/insights',
    '/reports',
  ]);
});
it('does not call either service when authentication fails', async () => {
  jest.mocked(validateUserToken).mockRejectedValue(new Error('Session unavailable'));
  await createFirstProject(projectInput);
  await saveFirstUseTimezone({ timezone: 'UTC' });
  expect(createFirstProjectForOwner).not.toHaveBeenCalled();
  expect(saveFirstUseTimezoneForOwner).not.toHaveBeenCalled();
});
it('does not invalidate caches for a retryable unconfirmed result', async () => {
  jest
    .mocked(saveFirstUseTimezoneForOwner)
    .mockResolvedValue({ ok: false, error: { code: 'CONFLICT', retryable: true, message: 'Retry' } });
  expect((await saveFirstUseTimezone({ timezone: 'UTC' }))?.data).toMatchObject({ ok: false });
  expect(revalidatePath).not.toHaveBeenCalled();
});
