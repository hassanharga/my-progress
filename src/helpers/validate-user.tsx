'use server';

import { getFromCookies } from '@/utils/cookie';
// import { isTokenExpired } from '@/utils/token';
import { type User } from '@prisma/client';

import { verifyToken } from '@/lib/generate-token';

export const validateUserToken = async (): Promise<Partial<User>> => {
  // const isExpired = await isTokenExpired();
  // if (isExpired) throw new Error('Unauthorized');

  const token = await getFromCookies<string>('token');
  if (!token) throw new Error('Unauthorized');

  const data = verifyToken(token) as Partial<User>;
  if (!data) throw new Error('Unauthorized');

  return data;
};
