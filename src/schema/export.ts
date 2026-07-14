import { z } from 'zod';

export const exportPresetSchema = z.enum(['all_time', 'this_week', 'this_month', 'last_month', 'custom']);

export const exportOptionsSchema = z
  .object({
    preset: exportPresetSchema,
    dateFrom: z.iso.datetime().optional(),
    dateTo: z.iso.datetime().optional(),
  })
  .refine((data) => data.preset !== 'custom' || (data.dateFrom && data.dateTo), {
    message: 'Custom preset requires dateFrom and dateTo',
    path: ['dateFrom'],
  });

export type ExportPreset = z.infer<typeof exportPresetSchema>;
export type ExportOptions = z.infer<typeof exportOptionsSchema>;
