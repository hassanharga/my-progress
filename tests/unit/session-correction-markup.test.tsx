import type { TaskWorkspaceViewModel } from '@/server/projects/project-workspace-types';
import { renderToStaticMarkup } from 'react-dom/server';

import { SessionHistory } from '@/components/task-workspace/SessionHistory';

const session = (
  overrides: Partial<TaskWorkspaceViewModel['sessions'][number]> = {}
): TaskWorkspaceViewModel['sessions'][number] => ({
  correctedAt: null,
  correctionReason: null,
  endedAt: new Date('2026-09-21T11:00:00.000Z'),
  id: 'session-closed',
  originalEndedAt: null,
  originalStartedAt: null,
  source: 'TIMER',
  startedAt: new Date('2026-09-21T10:00:00.000Z'),
  ...overrides,
});

describe('Session correction markup', () => {
  it('labels correction fields and associates a correction error', () => {
    const html = renderToStaticMarkup(
      <SessionHistory
        archived={false}
        drafts={{}}
        errorBySession={{ 'session-closed': 'The corrected time overlaps another session.' }}
        onCorrect={() => undefined}
        onDraftChange={() => undefined}
        pending={{}}
        sessions={[session()]}
      />
    );

    expect(html).toContain('Start time');
    expect(html).toContain('End time');
    expect(html).toContain('Reason for correction');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="session-session-closed-error"');
    expect(html).toContain('id="session-session-closed-error"');
  });

  it('offers correction only for closed sessions and directs open work to Pause', () => {
    const html = renderToStaticMarkup(
      <SessionHistory
        archived={false}
        drafts={{}}
        errorBySession={{}}
        onCorrect={() => undefined}
        onDraftChange={() => undefined}
        pending={{}}
        sessions={[session({ endedAt: null, id: 'session-open' }), session()]}
      />
    );

    expect(html).toContain('Pause the timer before correcting this session.');
    expect(html.match(/Reason for correction/g)).toHaveLength(1);
  });

  it('keeps correction controls read-only for archived projects', () => {
    const html = renderToStaticMarkup(
      <SessionHistory
        archived
        drafts={{}}
        errorBySession={{}}
        onCorrect={() => undefined}
        onDraftChange={() => undefined}
        pending={{}}
        sessions={[session()]}
      />
    );

    expect(html).toContain('Session corrections are unavailable while this project is archived.');
    expect(html).not.toContain('Save correction');
  });
});
