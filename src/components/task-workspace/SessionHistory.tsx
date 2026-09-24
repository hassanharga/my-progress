import type { TaskWorkspaceViewModel } from '@/server/projects/project-workspace-types';

import { correctionDraftForSession, SessionCorrectionForm } from './SessionCorrectionForm';
import type { CorrectionDraft } from './task-workspace-reducer';

const formatMoment = (value: Date): string =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(value);

const formatDuration = (startedAt: Date, endedAt: Date): string => {
  const minutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export function SessionHistory({
  archived,
  drafts,
  errorBySession,
  onCorrect,
  onDraftChange,
  pending,
  sessions,
}: {
  archived: boolean;
  drafts: Record<string, CorrectionDraft>;
  errorBySession: Record<string, string>;
  onCorrect: (sessionId: string) => void;
  onDraftChange: (sessionId: string, value: CorrectionDraft) => void;
  pending: Record<string, number>;
  sessions: TaskWorkspaceViewModel['sessions'];
}) {
  return (
    <section aria-labelledby="task-session-history-heading" className="task-workspace-section">
      <div className="task-workspace-section__heading">
        <h3 id="task-session-history-heading">Session history</h3>
        <p>Recorded work intervals and their audit details.</p>
      </div>
      {archived && sessions.some((session) => session.endedAt) ? (
        <p className="task-workspace-read-only-note">
          Session corrections are unavailable while this project is archived.
        </p>
      ) : null}
      {sessions.length ? (
        <ol className="task-session-list">
          {sessions.map((session) => (
            <li key={session.id}>
              <div className="task-session-list__summary">
                <div>
                  <time dateTime={session.startedAt.toISOString()}>{formatMoment(session.startedAt)}</time>
                  <span aria-hidden="true"> → </span>
                  {session.endedAt ? (
                    <time dateTime={session.endedAt.toISOString()}>{formatMoment(session.endedAt)}</time>
                  ) : (
                    <span>Running now</span>
                  )}
                </div>
                {session.endedAt ? <strong>{formatDuration(session.startedAt, session.endedAt)}</strong> : null}
              </div>
              {session.correctedAt ? (
                <p className="task-session-list__audit">
                  Corrected {formatMoment(session.correctedAt)} · {session.correctionReason}
                </p>
              ) : null}
              {!session.endedAt ? (
                <p className="task-workspace-read-only-note">Pause the timer before correcting this session.</p>
              ) : !archived ? (
                <SessionCorrectionForm
                  draft={drafts[session.id] ?? correctionDraftForSession(session)}
                  error={errorBySession[session.id]}
                  onChange={(value) => onDraftChange(session.id, value)}
                  onSubmit={() => onCorrect(session.id)}
                  pending={Boolean(pending[`correction:${session.id}`])}
                  session={session}
                />
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="task-workspace-empty">No work sessions have been recorded yet.</p>
      )}
    </section>
  );
}
