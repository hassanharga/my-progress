import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8).max(100),
});

export const registerSchema = z
  .object({
    name: z.string().min(2).max(100).trim(),
    email: z.email().trim(),
    password: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: 'custom',
        message: 'The passwords did not match',
        path: ['confirmPassword'],
      });
    }
  });

export const settingsSchema = z.object({
  weekStartDay: z.enum(['SUNDAY', 'MONDAY', 'SATURDAY']).default('MONDAY'),
});
