import { createSafeActionClient } from 'next-safe-action';

import { logger } from '@/utils/logger';

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
