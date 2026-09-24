'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TaskWorkspaceMutation } from '@/schema/task-workspace';
import type { ProjectWorkspaceViewModel } from '@/server/projects/project-workspace-types';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';

import { correctWorkSession, mutateTaskWorkspace } from '@/actions/task-workspace';
import { buildProjectWorkspaceHref } from '@/components/project-workspace/project-workspace-url';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';

import { NextStepEditor } from './NextStepEditor';
import { correctionDraftForSession } from './SessionCorrectionForm';
import { SessionHistory } from './SessionHistory';
import {
  createProjectWorkspaceClientState,
  settleTaskWorkspaceRequest,
  taskWorkspaceReducer,
  type CorrectionDraft,
} from './task-workspace-reducer';
import { TaskWorkspaceHeader } from './TaskWorkspaceHeader';
import { WorkLogComposer } from './WorkLogComposer';
import { WorkLogTimeline } from './WorkLogTimeline';

type DraftFields = { nextStep: string; progress: string; progressNextStep: string };

const mutationKey = (mutation: TaskWorkspaceMutation): string => {
  if (mutation.type === 'LOG_PROGRESS') return 'progress';
  if (mutation.type === 'UPDATE_NEXT_STEP') return 'next-step';
  return `transition:${mutation.transition.event.toLowerCase()}`;
};

const transitionNotice: Record<'CANCEL' | 'COMPLETE' | 'PAUSE' | 'START', string> = {
  CANCEL: 'Task cancelled.',
  COMPLETE: 'Task completed.',
  PAUSE: 'Timer paused.',
  START: 'Timer started.',
};

export const taskWorkspaceCloseHref = (workspace: ProjectWorkspaceViewModel): string =>
  buildProjectWorkspaceHref(workspace.project.id, { current: workspace.query, update: { taskId: null } });

const toIsoString = (value: string): string => new Date(value).toISOString();

function TaskWorkspaceFinishActions({
  onTransition,
  pending,
}: {
  onTransition: (event: 'CANCEL' | 'COMPLETE') => void;
  pending: Record<string, number>;
}) {
  const transitionPending = Object.keys(pending).some((key) => key.startsWith('transition:'));
  return (
    <section aria-labelledby="task-finish-heading" className="task-workspace-section task-workspace-finish">
      <div className="task-workspace-section__heading">
        <h3 id="task-finish-heading">Finish this task</h3>
        <p>Completion and cancellation both preserve its work history.</p>
      </div>
      <div className="task-workspace-finish__actions">
        <Button disabled={transitionPending} onClick={() => onTransition('COMPLETE')} type="button" variant="default">
          {pending['transition:complete'] ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CheckCircle2 data-icon="inline-start" />
          )}
          Complete task
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={transitionPending} type="button" variant="danger">
              <XCircle data-icon="inline-start" />
              Cancel task…
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel this task?</DialogTitle>
              <DialogDescription>
                The task leaves active work but keeps every session, progress entry, and Today record.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="default">
                  Keep task
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={() => onTransition('CANCEL')} type="button" variant="danger">
                  {pending['transition:cancel'] ? <Spinner data-icon="inline-start" /> : null}
                  Confirm cancellation
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

export function TaskWorkspacePanel({
  composerExpanded = false,
  correctionDrafts,
  drafts,
  errorBySession = {},
  errorByField = {},
  onCorrectionDraftChange,
  onCorrectSession,
  onDraftChange,
  onComposerExpandedChange = () => undefined,
  onLogProgress,
  onTransition,
  onUpdateNextStep,
  pending,
  showFinishActions = true,
  workspace,
}: {
  composerExpanded?: boolean;
  correctionDrafts: Record<string, CorrectionDraft>;
  drafts: DraftFields;
  errorBySession?: Record<string, string>;
  errorByField?: { nextStep?: string | null; progress?: string | null };
  onCorrectionDraftChange: (sessionId: string, value: CorrectionDraft) => void;
  onCorrectSession: (sessionId: string) => void;
  onDraftChange: (field: keyof DraftFields, value: string) => void;
  onComposerExpandedChange?: (expanded: boolean) => void;
  onLogProgress: () => void;
  onTransition: (event: 'CANCEL' | 'COMPLETE' | 'PAUSE' | 'START') => void;
  onUpdateNextStep: () => void;
  pending: Record<string, number>;
  showFinishActions?: boolean;
  workspace: ProjectWorkspaceViewModel;
}) {
  const selected = workspace.selectedTask;
  if (!selected) return null;

  const archived = workspace.project.archived;
  const terminal = selected.task.status === 'COMPLETED' || selected.task.status === 'CANCELLED';
  const transitionPending = Object.keys(pending).some((key) => key.startsWith('transition:'));

  return (
    <div className="task-workspace-panel">
      <TaskWorkspaceHeader
        archived={archived}
        onTransition={onTransition}
        pending={transitionPending}
        projectName={workspace.project.name}
        task={selected.task}
      />
      {archived ? (
        <p className="task-workspace-read-only-note" role="status">
          Restore this project to make changes.
        </p>
      ) : null}
      <Separator />
      <NextStepEditor
        archived={archived || terminal}
        current={selected.task.currentNextStep}
        draft={drafts.nextStep}
        error={errorByField.nextStep}
        onChange={(value) => onDraftChange('nextStep', value)}
        onSubmit={onUpdateNextStep}
        pending={Boolean(pending['next-step'])}
      />
      {!archived && !terminal ? (
        <WorkLogComposer
          content={drafts.progress}
          expanded={composerExpanded}
          error={errorByField.progress}
          nextStep={drafts.progressNextStep}
          onChange={(value) => onDraftChange('progress', value)}
          onExpandedChange={onComposerExpandedChange}
          onNextStepChange={(value) => onDraftChange('progressNextStep', value)}
          onSubmit={onLogProgress}
          pending={Boolean(pending.progress)}
        />
      ) : null}
      <WorkLogTimeline entries={selected.workLog} />
      <SessionHistory
        archived={archived}
        drafts={correctionDrafts}
        errorBySession={errorBySession}
        onCorrect={onCorrectSession}
        onDraftChange={onCorrectionDraftChange}
        pending={pending}
        sessions={selected.sessions}
      />
      {!archived && !terminal && showFinishActions ? (
        <TaskWorkspaceFinishActions onTransition={onTransition} pending={pending} />
      ) : null}
    </div>
  );
}

export function TaskWorkspaceSheet({ initialWorkspace }: { initialWorkspace: ProjectWorkspaceViewModel }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(taskWorkspaceReducer, initialWorkspace, createProjectWorkspaceClientState);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [errorBySession, setErrorBySession] = useState<Record<string, string>>({});
  const sequence = useRef(0);
  const latest = useRef<Record<string, number>>({});
  const opener = useRef<HTMLElement | null>(null);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    refreshInFlight.current = false;
    dispatch({ type: 'RESET_CANONICAL', workspace: initialWorkspace });
  }, [initialWorkspace]);

  useEffect(() => {
    if (
      !state.requiresRefresh ||
      state.refreshRequested ||
      Object.keys(state.pending).length ||
      refreshInFlight.current
    )
      return;
    refreshInFlight.current = true;
    dispatch({ type: 'REFRESH_REQUESTED' });
    router.refresh();
  }, [router, state.pending, state.refreshRequested, state.requiresRefresh]);

  const request = useCallback((key: string): number => {
    refreshInFlight.current = false;
    const requestId = sequence.current + 1;
    sequence.current = requestId;
    latest.current[key] = requestId;
    dispatch({ key, requestId, type: 'REQUEST' });
    if (key.startsWith('correction:')) {
      const sessionId = key.slice('correction:'.length);
      setErrorBySession((current) => ({ ...current, [sessionId]: '' }));
    }
    return requestId;
  }, []);

  const { executeAsync: executeMutation } = useAction(mutateTaskWorkspace);
  const { executeAsync: executeCorrection } = useAction(correctWorkSession);

  const runMutation = (mutation: TaskWorkspaceMutation) => {
    const key = mutationKey(mutation);
    const requestId = request(key);
    void settleTaskWorkspaceRequest({
      dispatch,
      execute: () => executeMutation({ mutation, query: state.canonical.query }),
      key,
      onError: () => ({ message: 'This change could not be confirmed. Refresh and try again.', type: 'FAILURE' }),
      onResult: ({ data, serverError }) => {
        if (!data) {
          return {
            message: serverError ?? 'This change could not be confirmed. Refresh and try again.',
            type: 'FAILURE',
          };
        }
        if (!data.ok) return { canonical: data.canonical, message: data.error.message, type: 'FAILURE' };
        const clear: 'nextStep' | 'progress' | undefined =
          mutation.type === 'LOG_PROGRESS' ? 'progress' : mutation.type === 'UPDATE_NEXT_STEP' ? 'nextStep' : undefined;
        const message =
          mutation.type === 'LOG_PROGRESS'
            ? 'Progress saved.'
            : mutation.type === 'UPDATE_NEXT_STEP'
              ? 'Next step saved.'
              : transitionNotice[mutation.transition.event];
        if (mutation.type === 'LOG_PROGRESS' && latest.current[key] === requestId) setComposerExpanded(false);
        return { clear, message, type: 'SUCCESS', workspace: data.data };
      },
      requestId,
    });
  };

  const selected = state.canonical.selectedTask;
  const handleTransition = (event: 'CANCEL' | 'COMPLETE' | 'PAUSE' | 'START') => {
    if (!selected) return;
    runMutation({
      projectId: state.canonical.project.id,
      transition: { event, taskId: selected.task.id },
      type: 'TRANSITION',
    });
  };
  const closeHref = taskWorkspaceCloseHref(state.canonical);
  const openHref = selected
    ? buildProjectWorkspaceHref(state.canonical.project.id, {
        current: state.canonical.query,
        update: { taskId: selected.task.id },
      })
    : null;

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open && selected) router.push(closeHref);
      }}
      open={Boolean(selected)}
    >
      <SheetContent
        className="task-workspace-sheet"
        onOpenAutoFocus={() => {
          const active = document.activeElement;
          if (active instanceof HTMLElement && active.matches('a[href]')) opener.current = active;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const matchingOpener = opener.current?.isConnected
            ? opener.current
            : openHref
              ? Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).find(
                  (anchor) => anchor.getAttribute('href') === openHref
                )
              : null;
          const focusTarget = matchingOpener ?? document.getElementById('project-workspace-heading');
          if (!matchingOpener) focusTarget?.setAttribute('tabindex', '-1');
          focusTarget?.focus();
        }}
      >
        <SheetHeader className="task-workspace-sheet__header">
          <SheetTitle>{selected?.task.title ?? 'Task workspace'}</SheetTitle>
          <SheetDescription>
            Review progress, next steps, work sessions, and task state without leaving this project.
          </SheetDescription>
        </SheetHeader>
        {state.notice ? (
          <p
            className="task-workspace-notice"
            data-tone={state.notice.tone}
            role={state.notice.tone === 'error' ? 'alert' : 'status'}
          >
            {state.notice.message}
          </p>
        ) : null}
        <TaskWorkspacePanel
          composerExpanded={composerExpanded}
          correctionDrafts={state.drafts.corrections}
          drafts={state.drafts}
          errorBySession={errorBySession}
          errorByField={state.fieldErrors}
          onCorrectionDraftChange={(sessionId, value) => dispatch({ sessionId, type: 'EDIT_CORRECTION', value })}
          onCorrectSession={(sessionId) => {
            if (!selected) return;
            const draft = state.drafts.corrections[sessionId];
            const session = selected.sessions.find((item) => item.id === sessionId);
            if (!session?.endedAt) return;
            const effective = draft ?? correctionDraftForSession(session);
            const key = `correction:${sessionId}`;
            const startedAt = Date.parse(effective.startedAt);
            const endedAt = Date.parse(effective.endedAt);
            if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
              setErrorBySession((current) => ({
                ...current,
                [sessionId]: 'Enter a valid end time after the start time.',
              }));
              return;
            }
            const requestId = request(key);
            void settleTaskWorkspaceRequest({
              dispatch,
              execute: () =>
                executeCorrection({
                  correction: {
                    endedAt: toIsoString(effective.endedAt),
                    projectId: state.canonical.project.id,
                    reason: effective.reason,
                    sessionId,
                    startedAt: toIsoString(effective.startedAt),
                    taskId: selected.task.id,
                  },
                  query: state.canonical.query,
                }),
              key,
              onError: () => {
                const message = 'This correction could not be confirmed. Refresh and try again.';
                if (latest.current[key] === requestId)
                  setErrorBySession((current) => ({ ...current, [sessionId]: message }));
                return { message, type: 'FAILURE' };
              },
              onResult: ({ data, serverError }) => {
                if (!data) {
                  const message = serverError ?? 'This correction could not be confirmed. Refresh and try again.';
                  if (latest.current[key] === requestId)
                    setErrorBySession((current) => ({ ...current, [sessionId]: message }));
                  return { message, type: 'FAILURE' };
                }
                if (!data.ok) {
                  if (latest.current[key] === requestId)
                    setErrorBySession((current) => ({ ...current, [sessionId]: data.error.message }));
                  return { canonical: data.canonical, message: data.error.message, type: 'FAILURE' };
                }
                if (latest.current[key] === requestId)
                  setErrorBySession((current) => ({ ...current, [sessionId]: '' }));
                return {
                  clear: { correction: sessionId },
                  message: 'Session corrected.',
                  type: 'SUCCESS',
                  workspace: data.data,
                };
              },
              requestId,
            });
          }}
          onDraftChange={(field, value) => dispatch({ field, type: 'EDIT_DRAFT', value })}
          onComposerExpandedChange={setComposerExpanded}
          onLogProgress={() => {
            if (!selected) return;
            runMutation({
              content: state.drafts.progress,
              ...(state.drafts.progressNextStep ? { nextStep: state.drafts.progressNextStep } : {}),
              projectId: state.canonical.project.id,
              taskId: selected.task.id,
              type: 'LOG_PROGRESS',
            });
          }}
          onTransition={handleTransition}
          onUpdateNextStep={() => {
            if (!selected) return;
            runMutation({
              nextStep: state.drafts.nextStep,
              projectId: state.canonical.project.id,
              taskId: selected.task.id,
              type: 'UPDATE_NEXT_STEP',
            });
          }}
          pending={state.pending}
          showFinishActions={false}
          workspace={state.canonical}
        />
        {selected &&
        !state.canonical.project.archived &&
        selected.task.status !== 'COMPLETED' &&
        selected.task.status !== 'CANCELLED' ? (
          <TaskWorkspaceFinishActions onTransition={handleTransition} pending={state.pending} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
