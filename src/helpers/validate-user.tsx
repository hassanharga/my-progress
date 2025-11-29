'use server';

import { redirect, RedirectType } from 'next/navigation';
import { getFromCookies } from '@/utils/cookie';

import { paths } from '@/paths';
import { verifyToken } from '@/lib/generate-token';

// import { isTokenExpired } from '@/utils/token';
import { type User } from '../../generated/prisma/client';

export const validateUserToken = async (): Promise<Partial<User>> => {
  // const isExpired = await isTokenExpired();
  // if (isExpired) throw new Error('Unauthorized');

  const token = await getFromCookies<string>('token');
  // if (!token) throw new Error('Unauthorized');
  if (!token) redirect(paths.auth, RedirectType.replace);

  const data = verifyToken(token) as Partial<User>;
  // if (!data) throw new Error('Unauthorized');
  if (!data) redirect(paths.auth, RedirectType.replace);

  return data;
};
