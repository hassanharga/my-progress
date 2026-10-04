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

export const settingsSchema = z
  .object({
    weekStartDay: z.enum(['SUNDAY', 'MONDAY', 'SATURDAY']).optional(),
    timezone: z
      .string()
      .refine((value) => {
        if (/^[+-]/.test(value)) return false;
        try {
          new Intl.DateTimeFormat('en', { timeZone: value }).format();
          return true;
        } catch {
          return false;
        }
      }, 'Choose a valid IANA timezone.')
      .optional(),
    dailyCapacityMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Provide at least one preference.',
  });

export type SettingsInput = z.infer<typeof settingsSchema>;

export const firstUseTimezoneSchema = z.object({ timezone: settingsSchema.shape.timezone.unwrap() });
