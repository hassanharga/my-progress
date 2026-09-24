import type { FormEvent } from 'react';
import type { TaskWorkspaceSession } from '@/server/projects/project-workspace-types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

import type { CorrectionDraft } from './task-workspace-reducer';

const localDateTime = (value: Date): string => {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const correctionDraftForSession = (session: TaskWorkspaceSession): CorrectionDraft => ({
  endedAt: session.endedAt ? localDateTime(session.endedAt) : '',
  reason: session.correctionReason ?? '',
  startedAt: localDateTime(session.startedAt),
});

export function SessionCorrectionForm({
  draft,
  error,
  onChange,
  onSubmit,
  pending,
  session,
}: {
  draft: CorrectionDraft;
  error?: string;
  onChange: (value: CorrectionDraft) => void;
  onSubmit: () => void;
  pending: boolean;
  session: TaskWorkspaceSession;
}) {
  const prefix = `session-${session.id}`;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="task-workspace-form task-session-correction" onSubmit={submit}>
      <div>
        <Label htmlFor={`${prefix}-start`}>Start time</Label>
        <Input
          aria-describedby={error ? `${prefix}-error` : undefined}
          aria-invalid={Boolean(error)}
          disabled={pending}
          id={`${prefix}-start`}
          onChange={(event) => onChange({ ...draft, startedAt: event.currentTarget.value })}
          required
          type="datetime-local"
          value={draft.startedAt}
        />
      </div>
      <div>
        <Label htmlFor={`${prefix}-end`}>End time</Label>
        <Input
          aria-describedby={error ? `${prefix}-error` : undefined}
          aria-invalid={Boolean(error)}
          disabled={pending}
          id={`${prefix}-end`}
          onChange={(event) => onChange({ ...draft, endedAt: event.currentTarget.value })}
          required
          type="datetime-local"
          value={draft.endedAt}
        />
      </div>
      <div className="task-session-correction__reason">
        <Label htmlFor={`${prefix}-reason`}>Reason for correction</Label>
        <textarea
          aria-describedby={error ? `${prefix}-error` : undefined}
          aria-invalid={Boolean(error)}
          disabled={pending}
          id={`${prefix}-reason`}
          maxLength={2_000}
          onChange={(event) => onChange({ ...draft, reason: event.currentTarget.value })}
          required
          rows={2}
          value={draft.reason}
        />
      </div>
      {error ? (
        <p className="task-workspace-field-error" id={`${prefix}-error`} role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={pending || !draft.reason.trim()} size="sm" type="submit" variant="default">
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Save correction
      </Button>
    </form>
  );
}
