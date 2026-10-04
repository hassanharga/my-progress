import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { validateUserToken } from '@/helpers/validate-user';
import { readAccountProfileForOwner } from '@/server/account/account-preferences';
import { readFirstUseForOwner } from '@/server/account/read-first-use';
import { readTodayForOwner } from '@/server/today/read-today';

import db from '@/lib/db';
import FirstUseToday from '@/components/onboarding/FirstUseToday';

import { TODAY_PRESENTATION } from './today-presentation';

export const metadata: Metadata = TODAY_PRESENTATION;

export default async function Dashboard() {
  const user = await validateUserToken();
  const today = await readTodayForOwner({
    ownerId: user.id!,
    prisma: db,
  });

  const profile = await readAccountProfileForOwner({ ownerId: user.id!, prisma: db });
  if (!profile) notFound();
  const firstUse = await readFirstUseForOwner({ ownerId: user.id!, prisma: db });
  return <FirstUseToday firstUse={firstUse} initialToday={today} profile={profile} />;
}
