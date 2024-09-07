'use server';

import { cookies } from 'next/headers';

import { logger } from './logger';

export type CookieKeys = 'token';

export async function getFromCookies<T>(key: CookieKeys): Promise<T | null> {
  const cookieStore = cookies();

  const valueStr = cookieStore.get(key)?.value;
  let value: T | null = null;

  if (valueStr) {
    try {
      value = JSON.parse(valueStr) as T;
    } catch {
      logger.error('Unable to parse the cookies');
    }
  }

  return value;
}

export async function setCookie<T>(key: CookieKeys, value: T): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(key, JSON.stringify(value));
}

export async function deleteCookie(key: CookieKeys): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(key);
}
