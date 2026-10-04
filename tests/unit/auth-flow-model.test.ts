import {
  isPrivateAccountPath,
  resolveAuthMode,
  resolveSessionNotice,
  shouldFocusAuthSummary,
} from '../../src/components/auth/auth-model';

it('focuses a newly rejected submission, not intermediate edits after correction', () => {
  const previous = { submitCount: 1, serverError: undefined };
  expect(
    shouldFocusAuthSummary({ pending: false, hasErrors: true, submitCount: 2, serverError: undefined }, previous)
  ).toBe(true);
  expect(
    shouldFocusAuthSummary({ pending: false, hasErrors: true, submitCount: 1, serverError: undefined }, previous)
  ).toBe(false);
  expect(
    shouldFocusAuthSummary({ pending: true, hasErrors: true, submitCount: 2, serverError: 'Failed' }, previous)
  ).toBe(false);
  expect(
    shouldFocusAuthSummary({ pending: false, hasErrors: true, submitCount: 1, serverError: 'Failed' }, previous)
  ).toBe(true);
});

it.each([
  ['register', 'register'],
  ['login', 'login'],
  ['unknown', 'login'],
  [undefined, 'login'],
  [['register'], 'login'],
])('resolves %j to %s', (input, expected) => {
  expect(resolveAuthMode(input)).toBe(expected);
});
it('allowlists session-ended wording and never echoes arbitrary reasons', () => {
  expect(resolveSessionNotice('session-ended')).toBe('Please sign in to continue. Your session may have ended.');
  expect(resolveSessionNotice('secret attacker text')).toBeNull();
  expect(resolveSessionNotice(undefined)).toBeNull();
});
it.each(['/dashboard', '/projects', '/projects/123', '/insights', '/reports/export', '/settings'])(
  'recognizes private %s',
  (path) => expect(isPrivateAccountPath(path)).toBe(true)
);
it.each(['/', '/auth', '/product', '/unknown', '/projects-public', '/settings-old'])(
  'does not redirect public/unknown %s',
  (path) => expect(isPrivateAccountPath(path)).toBe(false)
);
