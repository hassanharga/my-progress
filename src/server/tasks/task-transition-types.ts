export type ExecutionState = 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type TaskTransitionEvent = 'START' | 'PAUSE' | 'COMPLETE' | 'CANCEL';

export type TaskTransitionInput = {
  taskId: string;
  event: TaskTransitionEvent;
  progressNote?: string;
  nextStep?: string;
  completionSummary?: string;
};

export type DomainErrorCode = 'NOT_FOUND' | 'INVALID_TRANSITION' | 'CONFLICT' | 'VALIDATION_ERROR';

export type DomainResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: DomainErrorCode;
        message: string;
        retryable: boolean;
      };
      canonical?: T;
    };

export type TaskSnapshot = {
  id: string;
  title: string;
  createdAt: Date;
  projectId: string;
  status: ExecutionState;
  currentNextStep: string | null;
  totalSeconds: number;
  openSessionStartedAt: Date | null;
};

export type SessionSnapshot = {
  id: string;
  taskId: string;
  projectId: string;
  startedAt: Date;
  endedAt: Date | null;
};

export type TaskTransitionSnapshot = {
  task: TaskSnapshot;
  replacedTask: TaskSnapshot | null;
  session: SessionSnapshot | null;
  project: {
    id: string;
    runningTaskId: string | null;
    runningCount: number;
    pausedCount: number;
    openWorkCount: number;
    trackedSeconds: number;
  };
  today: {
    planDate: string;
    plannedMinutes: number;
    completedCount: number;
    openCount: number;
  } | null;
};
