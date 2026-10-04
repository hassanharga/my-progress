import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { config } from '../../src/config';
import { verifyToken } from '../../src/lib/generate-token';
import { readAccountIdentity } from '../../src/server/account/account-identity';
import { getFromCookies } from '../../src/utils/cookie';

jest.mock('../../src/config', () => ({ config: { jwt: { secret: 'test-only-key' } } }));
jest.mock('../../src/lib/generate-token', () => ({ verifyToken: jest.fn() }));
jest.mock('../../src/utils/cookie', () => ({ getFromCookies: jest.fn() }));
beforeEach(() => {
  jest.resetAllMocks();
  config.jwt.secret = 'test-only-key';
  jest.mocked(getFromCookies).mockResolvedValue('jwt');
  jest
    .mocked(verifyToken)
    .mockReturnValue({ id: 'owner', name: 'Owner', email: 'owner@example.test', password: 'secret' });
});
it('returns verified minimal identity, never token or arbitrary claims', async () => {
  expect(await readAccountIdentity()).toEqual({
    status: 'authenticated',
    user: { id: 'owner', name: 'Owner', email: 'owner@example.test' },
  });
});
it('returns missing without verifying when cookie is absent', async () => {
  jest.mocked(getFromCookies).mockResolvedValue(null);
  expect(await readAccountIdentity()).toEqual({ status: 'missing' });
  expect(verifyToken).not.toHaveBeenCalled();
});
it.each([{}, { id: '' }, { id: '  ' }, { id: 3 }, 'string-payload'])(
  'rejects unusable identity %j',
  async (payload) => {
    jest.mocked(verifyToken).mockReturnValue(payload);
    expect(await readAccountIdentity()).toEqual({ status: 'invalid' });
  }
);
it.each([
  [new JsonWebTokenError('invalid signature'), 'invalid'],
  [new TokenExpiredError('expired', new Date()), 'expired'],
] as const)('recognizes only token failures', async (error, status) => {
  jest.mocked(verifyToken).mockImplementation(() => {
    throw error;
  });
  expect(await readAccountIdentity()).toEqual({ status });
});
it.each([new Error('secret infrastructure'), new JsonWebTokenError('secretOrPublicKey is not valid key material')])(
  'sanitizes infrastructure/key errors',
  async (error) => {
    jest.mocked(verifyToken).mockImplementation(() => {
      throw error;
    });
    await expect(readAccountIdentity()).rejects.toThrow('Unable to verify your account. Please try again.');
  }
);
it('does not classify missing server configuration as session expiry', async () => {
  config.jwt.secret = undefined;
  await expect(readAccountIdentity()).rejects.toThrow('Unable to verify your account. Please try again.');
});
it('does not classify cookie storage failure as signed out', async () => {
  jest.mocked(getFromCookies).mockRejectedValue(new Error('secret cookie infrastructure'));
  await expect(readAccountIdentity()).rejects.toThrow('Unable to verify your account. Please try again.');
});

it('preserves Next.js dynamic rendering signals from request cookies', async () => {
  const signal = Object.assign(new Error('Dynamic server usage: cookies'), { digest: 'DYNAMIC_SERVER_USAGE' });
  jest.mocked(getFromCookies).mockRejectedValue(signal);
  await expect(readAccountIdentity()).rejects.toBe(signal);
});
