export const resolveAuthMode = (mode: unknown): 'login' | 'register' => (mode === 'register' ? 'register' : 'login');
export const resolveSessionNotice = (reason: unknown): string | null =>
  reason === 'session-ended' ? 'Please sign in to continue. Your session may have ended.' : null;
export const isPrivateAccountPath = (path: string): boolean =>
  ['/dashboard', '/projects', '/insights', '/reports', '/settings'].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

type AuthSettlement = { submitCount: number; serverError: string | undefined };
export const shouldFocusAuthSummary = (
  current: AuthSettlement & { pending: boolean; hasErrors: boolean },
  previous: AuthSettlement
): boolean =>
  !current.pending &&
  current.hasErrors &&
  (current.submitCount > previous.submitCount ||
    (!!current.serverError && current.serverError !== previous.serverError));
