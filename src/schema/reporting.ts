import { z } from 'zod';

import type { ExecutionState } from '../server/tasks/task-transition-types';

export const reportingProjectIdSchema = z.uuid();
export const reportingTaskStateSchema = z.enum(['ALL', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']);
export const reportingCorrectionStateSchema = z.enum(['ALL', 'CORRECTED', 'UNCORRECTED']);

export type ReportingQuery = {
  from: string;
  to: string;
  projectId: string | null;
  taskState: 'ALL' | ExecutionState;
  correctionState: 'ALL' | 'CORRECTED' | 'UNCORRECTED';
  page: number;
};

export type ReportingSearchParams = URLSearchParams | Record<string, string | string[] | undefined>;

export type ReportingQueryResult =
  { ok: true; query: ReportingQuery } | { ok: false; values: Record<string, string>; errors: Record<string, string> };
