'use server';

import { redirect, RedirectType } from 'next/navigation';
import { getFromCookies } from '@/utils/cookie';

import { User } from '@/types/user';
import { paths } from '@/paths';
import { verifyToken } from '@/lib/generate-token';

// import { isTokenExpired } from '@/utils/token';

export const validateUserToken = async (): Promise<Partial<User>> => {
  const token = await getFromCookies<string>('token');
  if (!token) redirect(paths.auth, RedirectType.replace);

  try {
    const data = verifyToken(token) as Partial<User>;
    if (!data) redirect(paths.auth, RedirectType.replace);
    return data;
  } catch {
    redirect(paths.auth, RedirectType.replace);
  }
};
