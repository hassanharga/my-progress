import { unstable_rethrow } from 'next/navigation';
import { getFromCookies } from '@/utils/cookie';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';

import { config } from '@/config';
import { verifyToken } from '@/lib/generate-token';

type AccountIdentity =
  | { status: 'authenticated'; user: { id: string; name?: string; email?: string } }
  | { status: 'missing' | 'invalid' | 'expired' };

export const readAccountIdentity = async (): Promise<AccountIdentity> => {
  try {
    const token = await getFromCookies<string>('token');
    if (!token) return { status: 'missing' };
    if (!config.jwt.secret) throw new Error('Account verification unavailable.');
    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      if (
        error instanceof JsonWebTokenError &&
        ['secret or public key must be provided', 'secretOrPublicKey is not valid key material'].includes(error.message)
      )
        throw error;
      if (error instanceof TokenExpiredError) return { status: 'expired' };
      if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) return { status: 'invalid' };
      throw error;
    }
    if (typeof payload === 'string' || typeof payload.id !== 'string' || !payload.id.trim())
      return { status: 'invalid' };
    return {
      status: 'authenticated',
      user: {
        id: payload.id,
        ...(typeof payload.name === 'string' ? { name: payload.name } : {}),
        ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    throw new Error('Unable to verify your account. Please try again.');
  }
};
