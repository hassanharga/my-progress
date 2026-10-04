import { metadata } from '../../src/app/auth/layout';
import AuthPage from '../../src/app/auth/page';

jest.mock('../../src/components/auth/AuthView', () => ({ __esModule: true, default: () => null }));
it.each([
  ['register', 'register'],
  ['login', 'login'],
  ['garbage', 'login'],
  [undefined, 'login'],
])('reads server mode %s', async (mode, expected) => {
  const view = await AuthPage({ searchParams: Promise.resolve({ mode }) });
  expect(view.props.initialMode).toBe(expected);
});
it('passes only allowlisted session notice', async () => {
  expect(
    (await AuthPage({ searchParams: Promise.resolve({ reason: 'session-ended' }) })).props.sessionNotice
  ).toBeTruthy();
  expect((await AuthPage({ searchParams: Promise.resolve({ reason: 'unsafe text' }) })).props.sessionNotice).toBeNull();
});
it('retains private noindex metadata', () => expect(metadata.robots).toMatchObject({ index: false }));
