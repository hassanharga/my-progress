import { resolveAuthMode, resolveSessionNotice } from '@/components/auth/auth-model';
import AuthView from '@/components/auth/AuthView';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[]; reason?: string | string[] }>;
}) {
  const query = await searchParams;
  return <AuthView initialMode={resolveAuthMode(query.mode)} sessionNotice={resolveSessionNotice(query.reason)} />;
}
