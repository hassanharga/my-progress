import { config } from '@/config';
import { createLogger } from '@/lib/create-logger';

export const logger = createLogger({ prefix: `[${config.site.name}]`, level: config.logLevel });
