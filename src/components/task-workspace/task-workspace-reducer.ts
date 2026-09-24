import type { ProjectWorkspaceViewModel } from '@/server/projects/project-workspace-types';

import { readableRichText } from '@/lib/rich-text-content';

export type CorrectionDraft = { endedAt: string; reason: string; startedAt: string };

export type WorkspaceDrafts = {
  corrections: Record<string, CorrectionDraft>;
  nextStep: string;
  progress: string;
  progressNextStep: string;
};

export type WorkspaceNotice = { message: string; tone: 'error' | 'info' | 'success' };

export type ProjectWorkspaceClientState = {
  canonical: ProjectWorkspaceViewModel;
  drafts: WorkspaceDrafts;
  fieldErrors: { nextStep: string | null; progress: string | null };
  notice: WorkspaceNotice | null;
  pending: Record<string, number>;
  requiresRefresh: boolean;
  refreshRequested: boolean;
};

type ClearTarget = 'nextStep' | 'progress' | { correction: string };

export type TaskWorkspaceAction =
  | { type: 'EDIT_DRAFT'; field: 'nextStep' | 'progress' | 'progressNextStep'; value: string }
  | { type: 'EDIT_CORRECTION'; sessionId: string; value: CorrectionDraft }
  | { type: 'REQUEST'; key: string; requestId: number }
  | {
      type: 'SUCCESS';
      clear?: ClearTarget;
      key: string;
      message: string;
      requestId: number;
      workspace: ProjectWorkspaceViewModel;
    }
  | {
      type: 'FAILURE';
      canonical?: ProjectWorkspaceViewModel;
      key: string;
      message: string;
      requestId: number;
    }
  | { type: 'RESET_CANONICAL'; workspace: ProjectWorkspaceViewModel }
  | { type: 'REFRESH_REQUESTED' };

type RequestSettlement =
  | { type: 'SUCCESS'; clear?: ClearTarget; message: string; workspace: ProjectWorkspaceViewModel }
  | { type: 'FAILURE'; canonical?: ProjectWorkspaceViewModel; message: string };

/** Keep the request identity attached to the promise that produced its result. */
export async function settleTaskWorkspaceRequest<Result>({
  dispatch,
  execute,
  key,
  onError,
  onResult,
  requestId,
}: {
  dispatch: (action: TaskWorkspaceAction) => void;
  execute: () => Promise<Result>;
  key: string;
  onError: (error: unknown) => Extract<RequestSettlement, { type: 'FAILURE' }>;
  onResult: (result: Result) => RequestSettlement;
  requestId: number;
}): Promise<void> {
  try {
    const settlement = onResult(await execute());
    dispatch({ ...settlement, key, requestId });
  } catch (error) {
    dispatch({ ...onError(error), key, requestId });
  }
}

export const createProjectWorkspaceClientState = (
  canonical: ProjectWorkspaceViewModel
): ProjectWorkspaceClientState => ({
  canonical,
  drafts: {
    corrections: {},
    nextStep: readableRichText(canonical.selectedTask?.task.currentNextStep),
    progress: '',
    progressNextStep: '',
  },
  fieldErrors: { nextStep: null, progress: null },
  notice: null,
  pending: {},
  requiresRefresh: false,
  refreshRequested: false,
});

const withoutPending = (pending: Record<string, number>, key: string): Record<string, number> => {
  const next = { ...pending };
  delete next[key];
  return next;
};

const clearedDrafts = (drafts: WorkspaceDrafts, clear?: ClearTarget): WorkspaceDrafts => {
  if (!clear) return drafts;
  if (clear === 'progress') return { ...drafts, progress: '', progressNextStep: '' };
  if (clear === 'nextStep') return { ...drafts, nextStep: '' };
  const corrections = { ...drafts.corrections };
  delete corrections[clear.correction];
  return { ...drafts, corrections };
};

export function taskWorkspaceReducer(
  state: ProjectWorkspaceClientState,
  action: TaskWorkspaceAction
): ProjectWorkspaceClientState {
  switch (action.type) {
    case 'EDIT_DRAFT':
      return { ...state, drafts: { ...state.drafts, [action.field]: action.value } };
    case 'EDIT_CORRECTION':
      return {
        ...state,
        drafts: { ...state.drafts, corrections: { ...state.drafts.corrections, [action.sessionId]: action.value } },
      };
    case 'REQUEST':
      return {
        ...state,
        fieldErrors:
          action.key === 'progress'
            ? { ...state.fieldErrors, progress: null }
            : action.key === 'next-step'
              ? { ...state.fieldErrors, nextStep: null }
              : state.fieldErrors,
        notice: null,
        pending: { ...state.pending, [action.key]: action.requestId },
        requiresRefresh: state.requiresRefresh || Object.keys(state.pending).some((key) => key !== action.key),
        refreshRequested: false,
      };
    case 'SUCCESS':
      if (state.pending[action.key] !== action.requestId) return state;
      return {
        canonical: state.requiresRefresh ? state.canonical : action.workspace,
        drafts: clearedDrafts(state.drafts, action.clear),
        fieldErrors:
          action.key === 'progress'
            ? { ...state.fieldErrors, progress: null }
            : action.key === 'next-step'
              ? { ...state.fieldErrors, nextStep: null }
              : state.fieldErrors,
        notice: { message: action.message, tone: 'success' },
        pending: withoutPending(state.pending, action.key),
        requiresRefresh: state.requiresRefresh,
        refreshRequested: state.refreshRequested,
      };
    case 'FAILURE':
      if (state.pending[action.key] !== action.requestId) return state;
      return {
        ...state,
        canonical: state.requiresRefresh ? state.canonical : (action.canonical ?? state.canonical),
        fieldErrors:
          action.key === 'progress'
            ? { ...state.fieldErrors, progress: action.message }
            : action.key === 'next-step'
              ? { ...state.fieldErrors, nextStep: action.message }
              : state.fieldErrors,
        notice: { message: action.message, tone: 'error' },
        pending: withoutPending(state.pending, action.key),
      };
    case 'REFRESH_REQUESTED':
      return state.requiresRefresh && Object.keys(state.pending).length === 0
        ? { ...state, refreshRequested: true }
        : state;
    case 'RESET_CANONICAL':
      if (Object.keys(state.pending).length) return { ...state, requiresRefresh: true, refreshRequested: false };
      if (state.requiresRefresh && !state.refreshRequested) return state;
      return state.canonical.query.taskId === action.workspace.query.taskId
        ? { ...state, canonical: action.workspace, requiresRefresh: false, refreshRequested: false }
        : createProjectWorkspaceClientState(action.workspace);
  }
}
