import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(8).max(100),
});

export const registerSchema = z
  .object({
    name: z.string().min(2).max(100).trim(),
    email: z.string().email().trim(),
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
  currentProject: z.string().trim().optional(),
  currentCompany: z.string().trim().optional(),
});
