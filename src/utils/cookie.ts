'use server';

import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { cookies } from 'next/headers';

import { config } from '@/config';

import { logger } from './logger';

export type CookieKeys = 'token';

export async function getFromCookies<T>(key: CookieKeys): Promise<T | null> {
  const cookieStore = await cookies();

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

type Options = Parameters<ReadonlyRequestCookies['set']>['2'];

export async function setCookie<T>(key: CookieKeys, value: T, options: Partial<Options> = {}): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(key, JSON.stringify(value), {
    httpOnly: true, // Prevent access via JavaScript
    secure: config.site.isProduction, // Use HTTPS
    path: '/', // Scope of the cookie
    sameSite: 'lax', // Prevent CSRF attacks
    ...options,
  });
}

export async function deleteCookie(key: CookieKeys): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(key);
}
