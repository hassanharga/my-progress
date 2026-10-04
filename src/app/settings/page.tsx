import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { validateUserToken } from '@/helpers/validate-user';
import { readAccountProfileForOwner } from '@/server/account/account-preferences';

import db from '@/lib/db';
import SettingsView from '@/components/settings/SettingsView';

export const metadata: Metadata = { title: 'Settings', robots: { index: false, follow: false } };
export default async function SettingsPage() {
  const { id } = await validateUserToken();
  if (!id) notFound();
  const profile = await readAccountProfileForOwner({ prisma: db, ownerId: id });
  if (!profile) notFound();
  return <SettingsView profile={profile} />;
}
