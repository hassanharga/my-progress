import { renderToStaticMarkup } from 'react-dom/server';

import AuthView from '../../src/components/auth/AuthView';

const mockState = { pending: false, serverError: undefined as string | undefined };
let mockFormProps: { shouldFocusError?: boolean };
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('../../src/contexts/user.context', () => ({ useUserContext: () => ({ setUserData: jest.fn() }) }));
jest.mock('@next-safe-action/adapter-react-hook-form/hooks', () => ({
  useHookFormAction: (_action: unknown, _resolver: unknown, options: { formProps: typeof mockFormProps }) => {
    mockFormProps = options.formProps;
    return {
      form: { register: (name: string) => ({ name }), formState: { errors: {}, submitCount: 0 } },
      action: { isPending: mockState.pending, result: { serverError: mockState.serverError } },
      handleSubmitWithAction: jest.fn(),
    };
  },
}));
beforeEach(() => {
  mockState.pending = false;
  mockState.serverError = undefined;
});
it.each(['login', 'register'] as const)('keeps %s error-summary focus under application control', (mode) => {
  renderToStaticMarkup(<AuthView initialMode={mode} sessionNotice={null} />);
  // RHF's delayed first-field focus must not override the summary settlement effect.
  expect(mockFormProps.shouldFocusError).toBe(false);
});
it.each(['login', 'register'] as const)('renders one main/heading and linkable %s mode', (mode) => {
  const html = renderToStaticMarkup(<AuthView initialMode={mode} sessionNotice={null} />);
  expect(html.match(/<main\b/g)).toHaveLength(1);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain(mode === 'login' ? '/auth?mode=register' : '/auth?mode=login');
  expect(html).toContain('autoComplete="email"');
  expect(html).toContain(mode === 'login' ? 'autoComplete="current-password"' : 'autoComplete="new-password"');
  if (mode === 'register') expect(html).toContain('autoComplete="name"');
  expect(html).toContain('for="email"');
  expect(html).toContain('for="password"');
  expect(html).toContain('noValidate=""');
});
it('marks pending submission busy and disabled with stable wording', () => {
  mockState.pending = true;
  const html = renderToStaticMarkup(<AuthView initialMode="login" sessionNotice={null} />);
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('disabled=""');
  expect(html).toContain('Signing in…');
});
it('renders a focusable error summary with entered fields still mounted', () => {
  mockState.serverError = 'Unable to sign in. Please try again.';
  const html = renderToStaticMarkup(<AuthView initialMode="login" sessionNotice={null} />);
  expect(html).toContain('role="alert"');
  expect(html).toContain('tabindex="-1"');
  expect(html).toContain('Unable to sign in.');
  expect(html).toContain('name="email"');
});
