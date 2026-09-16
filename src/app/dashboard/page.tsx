import type { Metadata } from 'next';
import { validateUserToken } from '@/helpers/validate-user';

import db from '@/lib/db';
import { TodayCockpit } from '@/components/today/TodayCockpit';
import { readTodayForOwner } from '@/server/today/read-today';
import { TODAY_PRESENTATION } from './today-presentation';

export const metadata: Metadata = TODAY_PRESENTATION;

export default async function Dashboard() {
  const user = await validateUserToken();
  const today = await readTodayForOwner({
    ownerId: user.id!,
    prisma: db,
  });

  return <TodayCockpit initialToday={today} />;
}
