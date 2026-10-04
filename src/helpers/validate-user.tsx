'use server';

import { redirect, RedirectType } from 'next/navigation';
import { readAccountIdentity } from '@/server/account/account-identity';

import { User } from '@/types/user';

export const validateUserToken = async (): Promise<Partial<User>> => {
  const identity = await readAccountIdentity();
  if (identity.status !== 'authenticated') redirect('/auth?mode=login&reason=session-ended', RedirectType.replace);
  return identity.user;
};
