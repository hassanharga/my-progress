import { hash, verify } from 'argon2';

export const hashPassword = async (password: string): Promise<string> => {
  return await hash(password);
};

export const verifyPassword = async (hashedPassword: string, password: string): Promise<boolean> => {
  return await verify(hashedPassword, password);
};
