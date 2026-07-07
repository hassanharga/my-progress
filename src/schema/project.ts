import { z } from 'zod';

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const projectRenameSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
});

export const projectIdSchema = z.object({
  id: z.uuid(),
});
