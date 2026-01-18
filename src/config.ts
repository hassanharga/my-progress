import { LogLevel } from './lib/create-logger';
import { getSiteURL } from './utils/get-site-url';

export const config = {
  site: {
    name: 'My Progress',
    title: 'My Progress - Track Your Tasks and Projects',
    description:
      'Efficiently manage and track your project progress with our intuitive task management system. Monitor your work, analyze statistics, and boost productivity.',
    keywords: [
      'task management',
      'project tracking',
      'productivity tool',
      'time tracking',
      'project management',
      'work progress',
      'task tracker',
      'productivity app',
    ],
    url: getSiteURL(),
    ogImage: `${getSiteURL()}/og-image.png`,
    twitterHandle: '@hassanharga',
    twitterCreator: '@hassanharga',
    locale: 'en_US',
    type: 'website',
    version: process.env.NEXT_PUBLIC_SITE_VERSION || '0.0.0',
    isProduction: process.env.NODE_ENV === 'production',
  },
  logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as keyof typeof LogLevel) || LogLevel.ALL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expireAt: process.env.JWT_EXPIRE_AT,
  },
};
