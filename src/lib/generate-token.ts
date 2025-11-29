import { sign, verify, type JwtPayload, type SignOptions } from 'jsonwebtoken';

import type { User } from '../../generated/prisma/client';
import { config } from '../config';

type TR = SignOptions['expiresIn'];

export const generateToken = ({ id, ...payload }: Partial<User>): string => {
  if (!config.jwt.secret || !config.jwt.expireAt) throw new Error('JWT secret is not defined');

  return sign({ ...payload, sub: id, id }, config.jwt.secret, {
    expiresIn: (config.jwt.expireAt as unknown as TR) || '12h',
  });
};

export const verifyToken = (token: string): JwtPayload | string => {
  return verify(token, config.jwt.secret!);
};
