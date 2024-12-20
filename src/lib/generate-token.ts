import type { User } from '@prisma/client';
import { sign, verify, type JwtPayload } from 'jsonwebtoken';

import { config } from '../config';

export const generateToken = ({ id, ...payload }: Partial<User>): string => {
  const token = sign({ ...payload, sub: id, id }, config.jwt.secret!, {
    expiresIn: config.jwt.expireAt,
  });
  return token;
};

export const verifyToken = (token: string): JwtPayload | string => {
  return verify(token, config.jwt.secret!);
};
