import type { TaskWorkspaceViewModel } from '@/server/projects/project-workspace-types';

import { readableRichText } from '@/lib/rich-text-content';

const formatMoment = (value: Date): string =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(value);

export function WorkLogTimeline({ entries }: { entries: TaskWorkspaceViewModel['workLog'] }) {
  return (
    <section aria-labelledby="task-work-ledger-heading" className="task-workspace-section">
      <div className="task-workspace-section__heading">
        <h3 id="task-work-ledger-heading">Progress</h3>
        <p>Updates and milestones in chronological order.</p>
      </div>
      {entries.length ? (
        <ol className="task-work-log">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className="task-work-log__meta">
                <span>
                  {entry.kind === 'COMPLETION_SUMMARY'
                    ? 'Completion summary'
                    : entry.kind === 'NOTE'
                      ? 'Note'
                      : 'Progress'}
                </span>
                <time dateTime={entry.createdAt.toISOString()}>{formatMoment(entry.createdAt)}</time>
              </div>
              <p className="task-work-log__content">{readableRichText(entry.content)}</p>
              {entry.nextStepSnapshot ? (
                <p className="task-work-log__next">Next at that point: {readableRichText(entry.nextStepSnapshot)}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="task-workspace-empty">No progress has been logged yet.</p>
      )}
    </section>
  );
}
