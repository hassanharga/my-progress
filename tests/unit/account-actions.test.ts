import { revalidatePath } from 'next/cache';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { createUser, loginUser, me, updateSettings } from '../../src/actions/user';
import { config } from '../../src/config';
import { validateUserToken } from '../../src/helpers/validate-user';
import db from '../../src/lib/db';
import { generateToken, verifyToken } from '../../src/lib/generate-token';
import { verifyPassword } from '../../src/lib/hash';
import { updateAccountPreferencesForOwner } from '../../src/server/account/account-preferences';
import { getFromCookies, setCookie } from '../../src/utils/cookie';

jest.mock('../../src/lib/db', () => ({
  __esModule: true,
  default: { user: { findUnique: jest.fn(), create: jest.fn() } },
}));
jest.mock('../../src/utils/cookie', () => ({ getFromCookies: jest.fn(), setCookie: jest.fn() }));
jest.mock('../../src/helpers/validate-user', () => ({ validateUserToken: jest.fn() }));
jest.mock('../../src/lib/generate-token', () => ({ generateToken: jest.fn(), verifyToken: jest.fn() }));
jest.mock('../../src/lib/hash', () => ({
  hashPassword: jest.fn().mockResolvedValue('hash'),
  verifyPassword: jest.fn(),
}));
jest.mock('../../src/server/account/account-preferences', () => ({
  ...jest.requireActual('../../src/server/account/account-preferences'),
  updateAccountPreferencesForOwner: jest.fn(),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ logger: { error: jest.fn() } }));
jest.mock('../../src/config', () => ({ config: { jwt: { secret: 'test-only-secret' } } }));

const profile = {
  id: 'owner',
  name: 'Owner',
  email: 'owner@example.test',
  currentProjectId: 'project',
  currentProject: { id: 'project', name: 'Project' },
  weekStartDay: 'MONDAY' as const,
  timezone: 'Africa/Cairo',
  dailyCapacityMinutes: null,
};
const stored = { ...profile, password: 'secret-hash', todayRevision: 4, createdAt: new Date(), updatedAt: new Date() };
const credentials = { email: profile.email, password: 'password-123' };
beforeEach(() => {
  jest.resetAllMocks();
  config.jwt.secret = 'test-only-secret';
  jest.mocked(db.user.findUnique).mockResolvedValue(stored);
  jest.mocked(db.user.create).mockResolvedValue(stored);
  jest.mocked(verifyPassword).mockResolvedValue(true);
  jest.mocked(generateToken).mockReturnValue('secret-jwt');
  jest.mocked(getFromCookies).mockResolvedValue('secret-jwt');
  jest.mocked(verifyToken).mockReturnValue({ id: 'owner', email: profile.email });
  jest.mocked(validateUserToken).mockResolvedValue({ id: 'owner', email: 'stale@example.test' });
  jest.mocked(updateAccountPreferencesForOwner).mockResolvedValue(profile);
});
describe('safe account action boundaries', () => {
  it('signup supplies a server-generated UUID independently of client input', async () => {
    jest.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    const input = { ...credentials, name: 'Owner', confirmPassword: credentials.password, id: 'client-supplied-id' };
    const result = await createUser(input);
    expect(result?.serverError).toBeUndefined();
    const insertedId = jest.mocked(db.user.create).mock.calls[0][0].data.id;
    expect(insertedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(insertedId).not.toBe(input.id);
    expect(generateToken).toHaveBeenCalledWith({ id: result?.data?.id, name: 'Owner', email: profile.email });
  });
  it('registration returns only the safe profile; JWT stays in the existing cookie', async () => {
    jest.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    expect((await createUser({ ...credentials, name: 'Owner', confirmPassword: credentials.password }))?.data).toEqual(
      profile
    );
    expect(setCookie).toHaveBeenCalledWith('token', 'secret-jwt', { maxAge: 43200 });
  });
  it('login returns only the safe profile', async () => {
    expect((await loginUser(credentials))?.data).toEqual(profile);
    expect(verifyPassword).toHaveBeenCalledWith('secret-hash', credentials.password);
  });
  it('me preserves its safe user envelope and reads by verified owner ID', async () => {
    expect((await me())?.data).toEqual({ user: profile });
    expect(db.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'owner' } }));
  });
  it('settings authenticates the owner, returns a safe profile, and revalidates consumers', async () => {
    expect((await updateSettings({ weekStartDay: 'SUNDAY' }))?.data).toEqual(profile);
    expect(updateAccountPreferencesForOwner).toHaveBeenCalledWith({
      prisma: db,
      ownerId: 'owner',
      input: { weekStartDay: 'SUNDAY' },
    });
    expect(jest.mocked(revalidatePath).mock.calls.map(([path]) => path)).toEqual([
      '/settings',
      '/dashboard',
      '/projects',
      '/insights',
      '/reports',
    ]);
  });
  it('uses one generic message for unknown account and wrong password', async () => {
    jest.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    const missing = await loginUser(credentials);
    jest.mocked(verifyPassword).mockResolvedValue(false);
    const wrong = await loginUser(credentials);
    expect(missing?.serverError).toBeTruthy();
    expect(wrong?.serverError).toEqual(missing?.serverError);
  });
  it('maps duplicate registration races to a controlled account message', async () => {
    jest.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    jest.mocked(db.user.create).mockRejectedValue({ code: 'P2002', message: 'secret database relation detail' });
    expect(
      (await createUser({ ...credentials, name: 'Owner', confirmPassword: credentials.password }))?.serverError
    ).toBe('An account with this email already exists.');
  });
  it.each(['login', 'me', 'settings'] as const)(
    'sanitizes %s infrastructure errors instead of returning raw details or null',
    async (boundary) => {
      const error = new Error('secret database connection detail');
      jest.mocked(db.user.findUnique).mockRejectedValue(error);
      jest.mocked(updateAccountPreferencesForOwner).mockRejectedValue(error);
      const result = await (boundary === 'login'
        ? loginUser(credentials)
        : boundary === 'me'
          ? me()
          : updateSettings({ timezone: 'UTC' }));
      expect(result?.serverError).toBeTruthy();
      expect(result?.serverError).not.toContain('secret');
      expect(result?.data).toBeUndefined();
    }
  );
  it('sanitizes registration infrastructure failure', async () => {
    jest.mocked(db.user.findUnique).mockRejectedValue(new Error('secret database detail'));
    const result = await createUser({ ...credentials, name: 'Owner', confirmPassword: credentials.password });
    expect(result?.serverError).toBeTruthy();
    expect(result?.serverError).not.toContain('secret');
  });
  it('me returns null for missing authentication', async () => {
    jest.mocked(getFromCookies).mockResolvedValue(null);
    expect((await me())?.data).toBeNull();
  });
  it.each([new JsonWebTokenError('invalid signature'), new TokenExpiredError('expired', new Date())])(
    'me returns null only for recognized invalid/expired JWT',
    async (error) => {
      jest.mocked(verifyToken).mockImplementation(() => {
        throw error;
      });
      expect((await me())?.data).toBeNull();
    }
  );
  it('me reports verifier configuration errors, not unauthenticated null', async () => {
    jest.mocked(verifyToken).mockImplementation(() => {
      throw new Error('secret config error');
    });
    expect((await me())?.serverError).toBeTruthy();
  });
  it('me does not treat the library missing-secret error as an invalid session', async () => {
    config.jwt.secret = undefined;
    jest.mocked(verifyToken).mockImplementation(() => {
      throw new JsonWebTokenError('secret or public key must be provided');
    });
    expect((await me())?.serverError).toBe('Unable to load your account. Please try again.');
  });
  it('me does not treat invalid verifier key material as an invalid session', async () => {
    jest.mocked(verifyToken).mockImplementation(() => {
      throw new JsonWebTokenError('secretOrPublicKey is not valid key material');
    });
    expect((await me())?.serverError).toBe('Unable to load your account. Please try again.');
  });
  it('me preserves framework rendering signals instead of serializing an account failure', async () => {
    const signal = Object.assign(new Error('Dynamic server usage: cookies'), { digest: 'DYNAMIC_SERVER_USAGE' });
    jest.mocked(getFromCookies).mockRejectedValue(signal);
    await expect(me()).rejects.toBe(signal);
  });
});
