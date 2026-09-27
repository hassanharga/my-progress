import type { Prisma, PrismaClient } from '../../../generated/prisma/client';
import type { ProjectWorkspaceQuery } from '../../schema/project-workspace';
import type { ExecutionState } from '../tasks/task-transition-types';

export type { ProjectWorkspaceQuery, ProjectWorkspaceStateFilter } from '../../schema/project-workspace';

export type ProjectWorkspaceTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: ExecutionState;
  currentNextStep: string | null;
  totalSeconds: number;
  openSessionStartedAt: Date | null;
  plannedMinutes: number | null;
  planPosition: number | null;
  createdAt: Date;
  updatedAt: Date;
  terminalAt: Date | null;
};

export type TaskWorkspaceSession = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  source: 'TIMER' | 'MIGRATED' | 'MANUAL_CORRECTION';
  originalStartedAt: Date | null;
  originalEndedAt: Date | null;
  correctionReason: string | null;
  correctedAt: Date | null;
};

export type TaskWorkspaceViewModel = {
  task: ProjectWorkspaceTask;
  workLog: Array<{
    id: string;
    kind: 'PROGRESS' | 'NOTE' | 'COMPLETION_SUMMARY';
    content: string;
    nextStepSnapshot: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  sessions: TaskWorkspaceSession[];
  openSession: TaskWorkspaceSession | null;
};

export type ProjectWorkspaceViewModel = {
  project: { id: string; name: string; archived: boolean; archivedAt: Date | null };
  query: ProjectWorkspaceQuery;
  summary: {
    runningTaskId: string | null;
    openCount: number;
    completedCount: number;
    cancelledCount: number;
    trackedSeconds: number;
  };
  runningTask: ProjectWorkspaceTask | null;
  today: ProjectWorkspaceTask[];
  backlog: ProjectWorkspaceTask[];
  history: ProjectWorkspaceTask[];
  selectedTask: TaskWorkspaceViewModel | null;
};

export type ProjectWorkspaceQueryClient = PrismaClient | Prisma.TransactionClient;
