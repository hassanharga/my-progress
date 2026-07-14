import { logger } from '@/utils/logger';
import { createSafeActionClient } from 'next-safe-action';

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    logger.error('Server Action error:', {
      message: e.message,
      name: e.name,
      stack: e.stack,
    });
    return e.message;
  },
});
