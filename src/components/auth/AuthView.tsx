'use client';

import AuthShell from './AuthShell';
import Login from './login';
import Register from './register';

export default function AuthView({
  initialMode,
  sessionNotice,
}: {
  initialMode: 'login' | 'register';
  sessionNotice: string | null;
}) {
  return (
    <AuthShell>
      {sessionNotice ? (
        <p role="status" className="mb-6 max-w-sm text-body text-text-subtle">
          {sessionNotice}
        </p>
      ) : null}
      {initialMode === 'register' ? <Register key="register" /> : <Login key="login" />}
    </AuthShell>
  );
}
