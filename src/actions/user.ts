'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { validateUserToken } from '@/helpers/validate-user';
import { firstUseTimezoneSchema, loginSchema, registerSchema, settingsSchema } from '@/schema/user';
import { readAccountIdentity } from '@/server/account/account-identity';
import { readAccountProfileForOwner, updateAccountPreferencesForOwner } from '@/server/account/account-preferences';
import { accountProfileSelect, toAccountProfile } from '@/server/account/account-profile';
import { saveFirstUseTimezoneForOwner } from '@/server/account/save-first-use-timezone';
import { setCookie } from '@/utils/cookie';

import type { AccountProfile } from '@/types/user';
import { actionClient } from '@/lib/action-client';
import db from '@/lib/db';
import { generateToken } from '@/lib/generate-token';
import { hashPassword, verifyPassword } from '@/lib/hash';

const mapReturnedUser = async (user: AccountProfile): Promise<AccountProfile> => {
  const { id, name, email } = user;

  const token = generateToken({ id, name, email });
  // 12 hours
  await setCookie('token', token, { maxAge: 43200 });

  return toAccountProfile(user);
};

export const createUser = actionClient.inputSchema(registerSchema).action(async ({ parsedInput }) => {
  let newUser: AccountProfile;
  try {
    const existing = await db.user.findUnique({ where: { email: parsedInput.email }, select: { id: true } });
    if (existing) throw new Error('ACCOUNT_EXISTS');
    newUser = await db.user.create({
      data: {
        id: randomUUID(),
        email: parsedInput.email,
        password: await hashPassword(parsedInput.password),
        name: parsedInput.name,
      },
      select: accountProfileSelect,
    });
  } catch (error) {
    const duplicate =
      (error instanceof Error && error.message === 'ACCOUNT_EXISTS') ||
      (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002');
    throw new Error(
      duplicate ? 'An account with this email already exists.' : 'Unable to create your account. Please try again.'
    );
  }
  try {
    return await mapReturnedUser(newUser);
  } catch {
    throw new Error('Unable to sign in. Please try again.');
  }
});

export const loginUser = actionClient.inputSchema(loginSchema).action(async ({ parsedInput }) => {
  let profile: AccountProfile | null;
  try {
    const user = await db.user.findUnique({
      where: { email: parsedInput.email },
      select: { ...accountProfileSelect, password: true },
    });
    profile = user && (await verifyPassword(user.password, parsedInput.password)) ? toAccountProfile(user) : null;
  } catch {
    throw new Error('Unable to sign in. Please try again.');
  }
  if (!profile) throw new Error('Email or password is incorrect.');
  try {
    return await mapReturnedUser(profile);
  } catch {
    throw new Error('Unable to sign in. Please try again.');
  }
});

export const me = actionClient.action(async () => {
  try {
    const identity = await readAccountIdentity();
    if (identity.status !== 'authenticated') return null;
    const user = await readAccountProfileForOwner({ prisma: db, ownerId: identity.user.id });
    return user ? { user } : null;
  } catch (error) {
    unstable_rethrow(error);
    throw new Error('Unable to load your account. Please try again.');
  }
});

export const updateSettings = actionClient.inputSchema(settingsSchema).action(async ({ parsedInput }) => {
  const { id } = await validateUserToken();
  try {
    if (!id) throw new Error('Account unavailable.');
    const profile = await updateAccountPreferencesForOwner({ prisma: db, ownerId: id, input: parsedInput });
    for (const path of ['/settings', '/dashboard', '/projects', '/insights', '/reports']) revalidatePath(path);
    return toAccountProfile(profile);
  } catch {
    throw new Error('Unable to save preferences. Please try again.');
  }
});

export const saveFirstUseTimezone = actionClient.inputSchema(firstUseTimezoneSchema).action(async ({ parsedInput }) => {
  const { id } = await validateUserToken();
  if (!id) throw new Error('Account unavailable.');
  const result = await saveFirstUseTimezoneForOwner({ prisma: db, ownerId: id, input: parsedInput });
  if (result.ok) {
    for (const path of ['/settings', '/dashboard', '/projects', '/insights', '/reports']) revalidatePath(path);
  }
  return result;
});
