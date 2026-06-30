'use client';

import { useState } from 'react';

import AuthShell from '@/components/auth/AuthShell';
import Login from '@/components/auth/login';
import Register from '@/components/auth/register';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <AuthShell>
      {mode === 'login' ? (
        <Login onSwitchToRegister={() => setMode('register')} />
      ) : (
        <Register onSwitchToLogin={() => setMode('login')} />
      )}
    </AuthShell>
  );
}
