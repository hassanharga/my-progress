'use server';

import { redirect, RedirectType } from 'next/navigation';
import { validateUserToken } from '@/helpers/validate-user';
import { loginSchema, registerSchema, settingsSchema } from '@/schema/user';
import { getFromCookies, setCookie } from '@/utils/cookie';
import { type Prisma, type User } from '@prisma/client';

import { paths } from '@/paths';
import { actionClient } from '@/lib/action-client';
import db from '@/lib/db';
import { generateToken, verifyToken } from '@/lib/generate-token';
import { hashPassword, verifyPassword } from '@/lib/hash';

/**
 * Maps the returned user data to include a generated JWT token and redirects to the home page.
 *
 * @param user  - The user object to be mapped.
 * @returns Never, as the function redirects to the home page.
 */
const mapReturnedUser = async (user: User): Promise<never> => {
  const { id, name, email } = user;

  // generate token
  const token = generateToken({ id, name, email });
  await setCookie('token', token);

  //  return user and token
  // return { user: { id, name, email }, token: generateToken({ id, name, email }) };

  redirect(paths.home, RedirectType.replace);
};

const findUser = async (email: string, select?: Prisma.UserSelect): Promise<User | null> => {
  return await db.user.findUnique({
    where: { email },
    select,
  });
};

export const createUser = actionClient.schema(registerSchema).action(async ({ parsedInput }) => {
  // check current user exists
  const isUserExist = await findUser(parsedInput.email, { id: true });
  if (isUserExist) throw new Error('User already exists');

  // create user
  const newUser = await db.user.create({
    data: {
      email: parsedInput.email,
      password: await hashPassword(parsedInput.password),
      name: parsedInput.name,
    },
  });

  return mapReturnedUser(newUser);
});

export const loginUser = actionClient.schema(loginSchema).action(async ({ parsedInput }) => {
  // check user exists
  const user = await findUser(parsedInput.email);
  if (!user) throw new Error('Bad Credential');

  // check password
  const isMatch = await verifyPassword(user.password, parsedInput.password);
  if (!isMatch) throw new Error('Bad Credentials');

  return mapReturnedUser(user);
});

export const me = actionClient.action(async () => {
  await validateUserToken();

  const token = (await getFromCookies<string>('token'))!;

  const data = verifyToken(token) as Partial<User>;
  if (!data) throw new Error('Unauthorized');

  const user = await findUser(data?.email || '', {
    id: true,
    name: true,
    email: true,
    currentCompany: true,
    currentProject: true,
  });

  return { user };
});

export const updateSettings = actionClient.schema(settingsSchema).action(async ({ parsedInput }) => {
  const { email } = await validateUserToken();

  const data = await db.user.update({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      currentCompany: true,
      currentProject: true,
    },
    data: {
      currentCompany: parsedInput.currentCompany,
      currentProject: parsedInput.currentProject,
    },
  });

  return data;
});
