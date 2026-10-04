import { createElement } from 'react';
import { redirect } from 'next/navigation';
import { renderToStaticMarkup } from 'react-dom/server';

import UserProvider from '../../src/contexts/user.context';
import { validateUserToken } from '../../src/helpers/validate-user';
import { readAccountIdentity } from '../../src/server/account/account-identity';

// Unit hook harness exercises real provider callbacks and route effects, not browser focus.
let mockPathname = '/dashboard';
const mockReplace = jest.fn();
const mockExecute = jest.fn();
let mockStates: unknown[] = [];
let mockStateIndex = 0;
let mockEffectIndex = 0;
let mockEffectDeps: (unknown[] | undefined)[] = [];
let mockEffects: (() => void)[] = [];
let mockCallbacks: { onSuccess: (args: { data: null }) => void; onError: () => void };
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial: unknown) => {
    const index = mockStateIndex++;
    if (!(index in mockStates)) mockStates[index] = initial;
    return [
      mockStates[index],
      (value: unknown) => {
        mockStates[index] = value;
      },
    ];
  },
  useEffect: (effect: () => void, deps: unknown[] | undefined) => {
    const index = mockEffectIndex++;
    const previous = mockEffectDeps[index];
    if (!previous || !deps || deps.some((value, offset) => value !== previous[offset])) mockEffects.push(effect);
    mockEffectDeps[index] = deps;
  },
}));
jest.mock('next-safe-action/hooks', () => ({
  useAction: (_action: unknown, callbacks: typeof mockCallbacks) => {
    mockCallbacks = callbacks;
    return { execute: mockExecute };
  },
}));
jest.mock('../../src/actions/user', () => ({ me: jest.fn() }));
jest.mock('../../src/utils/cookie', () => ({ deleteCookie: jest.fn() }));

jest.mock('../../src/server/account/account-identity', () => ({ readAccountIdentity: jest.fn() }));
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  RedirectType: { replace: 'replace' },
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace }),
}));
beforeEach(() => {
  jest.resetAllMocks();
  mockPathname = '/dashboard';
  mockStates = [];
  mockStateIndex = 0;
  mockEffectIndex = 0;
  mockEffectDeps = [];
  mockEffects = [];
});

const renderProvider = () => {
  mockStateIndex = 0;
  mockEffectIndex = 0;
  renderToStaticMarkup(createElement(UserProvider, null, null));
  const effects = mockEffects;
  mockEffects = [];
  effects.forEach((effect) => effect());
};

it('redirects a settled null on private pages without treating it as a load failure', () => {
  renderProvider();
  expect(mockReplace).not.toHaveBeenCalled();
  mockCallbacks.onSuccess({ data: null });
  renderProvider();
  expect(mockReplace).toHaveBeenCalledWith('/auth?mode=login&reason=session-ended');
  expect(mockStates[2]).toBe(false);
});
it('keeps an infrastructure failure retryable without navigating to sign-in', () => {
  renderProvider();
  mockCallbacks.onError();
  renderProvider();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockStates[2]).toBe(true);
});
it('redirects when a settled signed-out public visit later enters a private route', () => {
  mockPathname = '/';
  renderProvider();
  mockCallbacks.onSuccess({ data: null });
  renderProvider();
  expect(mockReplace).not.toHaveBeenCalled();
  mockPathname = '/settings';
  renderProvider();
  expect(mockReplace).toHaveBeenCalledWith('/auth?mode=login&reason=session-ended');
});
it.each(['missing', 'invalid', 'expired'] as const)(
  'explains %s identity at a private page or action boundary',
  async (status) => {
    jest.mocked(readAccountIdentity).mockResolvedValue({ status });
    jest.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    await expect(validateUserToken()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/auth?mode=login&reason=session-ended', 'replace');
  }
);
it('retains authenticated owner identity', async () => {
  jest.mocked(readAccountIdentity).mockResolvedValue({ status: 'authenticated', user: { id: 'owner' } });
  expect(await validateUserToken()).toEqual({ id: 'owner' });
});
it('does not convert an infrastructure failure into a redirect', async () => {
  jest.mocked(readAccountIdentity).mockRejectedValue(new Error('Unable to verify your account. Please try again.'));
  await expect(validateUserToken()).rejects.toThrow('Unable to verify your account. Please try again.');
  expect(redirect).not.toHaveBeenCalled();
});
