import { type User } from '@prisma/client';
import { jwtDecode, type JwtPayload } from 'jwt-decode';

import { getFromCookies } from './cookie';
import { logger } from './logger';

type Payload = JwtPayload & User;

export const getDataFromToken = (token: string): Payload | null => {
  try {
    return jwtDecode<Payload>(token);
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

export const isTokenExpired = async (): Promise<boolean> => {
  try {
    const token = await getFromCookies<string>('token');
    if (!token) return true;
    const decodedToken = getDataFromToken(token);
    const currentTime = Date.now() / 1000;
    return (decodedToken?.exp || 0) < currentTime;
  } catch (error) {
    return true;
  }
};
