import { LogLevel } from './lib/create-logger';
import { getSiteURL } from './utils/get-site-url';

export const config = {
  site: {
    name: 'WIMP',
    description: '',
    // colorScheme: 'light',
    // themeColor: '#FF9D3F',
    primaryColor: 'itbaPrimary',
    url: getSiteURL(),
    version: process.env.NEXT_PUBLIC_SITE_VERSION || '0.0.0',
    isProduction: process.env.NODE_ENV === 'production',
  },
  logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as keyof typeof LogLevel) || LogLevel.ALL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expireAt: process.env.JWT_EXPIRE_AT,
  },
};
