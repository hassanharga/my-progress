import { accountProfileSelect, toAccountProfile } from '../../src/server/account/account-profile';

const stored = {
  id: 'owner',
  name: 'Owner',
  email: 'owner@example.test',
  password: 'secret-hash',
  currentProjectId: 'project',
  currentProject: { id: 'project', name: 'Project', ownerId: 'owner' },
  weekStartDay: 'MONDAY' as const,
  timezone: 'Africa/Cairo',
  dailyCapacityMinutes: 0,
  todayRevision: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  token: 'secret-token',
};

describe('safe account profile', () => {
  it('returns only the exact public fields, including a safe project identity', () => {
    expect(toAccountProfile(stored)).toEqual({
      id: 'owner',
      name: 'Owner',
      email: 'owner@example.test',
      currentProjectId: 'project',
      currentProject: { id: 'project', name: 'Project' },
      weekStartDay: 'MONDAY',
      timezone: 'Africa/Cairo',
      dailyCapacityMinutes: 0,
    });
    expect(Object.keys(accountProfileSelect).sort()).toEqual(Object.keys(toAccountProfile(stored)).sort());
    expect(accountProfileSelect.currentProject).toEqual({ select: { id: true, name: true } });
  });
  it('preserves null project and unspecified capacity', () => {
    expect(
      toAccountProfile({ ...stored, currentProjectId: null, currentProject: null, dailyCapacityMinutes: null })
    ).toMatchObject({ currentProjectId: null, currentProject: null, dailyCapacityMinutes: null });
  });
});
