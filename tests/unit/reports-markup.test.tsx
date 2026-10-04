import type { ReportingSnapshot } from '@/server/reporting/read-reporting';
import { renderToStaticMarkup } from 'react-dom/server';

import { paginateReportTasks } from '@/components/reports/reporting-page';
import { ReportsView } from '@/components/reports/ReportsView';

const snapshot: ReportingSnapshot = {
  query: {
    from: '2026-09-01',
    to: '2026-09-28',
    projectId: null,
    taskState: 'ALL',
    correctionState: 'CORRECTED',
    page: 2,
  },
  timezone: 'UTC',
  weekStartDay: 'MONDAY',
  generatedAt: new Date('2026-09-28T12:00:00Z'),
  ownedProjects: [{ id: 'project-1', name: 'Writing', archived: false }],
  facts: {
    plannedMinutes: 60,
    missingEstimateCount: 1,
    plannedTaskSeconds: 1800,
    missingEstimateWorkedSeconds: 0,
    unplannedSeconds: 0,
    trackedSeconds: 3600,
    uniqueWorkingSeconds: 3000,
    overlapSeconds: 600,
    varianceSeconds: 0,
    overrunCount: 0,
    sessionSplitCount: 0,
    daily: [],
    weekly: [],
    projects: [],
  },
  taskRows: Array.from({ length: 27 }, (_, index) => ({
    id: `task-${index}`,
    projectId: 'project-1',
    projectName: 'Writing',
    title: `Task ${String(index).padStart(2, '0')}`,
    status: 'PAUSED' as const,
    plannedMinutes: 0,
    missingEstimateCount: index === 0 ? 1 : 0,
    trackedSeconds: 120,
    sessionCount: 1,
  })),
  sessionRows: [
    {
      id: 'session-1',
      taskId: 'task-26',
      taskTitle: 'Task 26',
      projectId: 'project-1',
      projectName: 'Writing',
      startedAt: new Date('2026-09-20T08:00:00Z'),
      endedAt: new Date('2026-09-20T09:00:00Z'),
      correctedAt: new Date('2026-09-21T08:00:00Z'),
      scopedStartedAt: new Date('2026-09-20T08:00:00Z'),
      scopedEndedAt: new Date('2026-09-20T09:00:00Z'),
      scopedSeconds: 3600,
    },
  ],
};

describe('Reports markup', () => {
  it('keeps exactly 25 deterministic task rows on the first page', () => {
    const first = paginateReportTasks(snapshot.taskRows, 1);
    expect(first.rows).toHaveLength(25);
    expect(first.rows.map((row) => row.id)).toEqual(snapshot.taskRows.slice(0, 25).map((row) => row.id));
    expect(first.total).toBe(27);
    expect(first.pageCount).toBe(2);
  });

  it('paginates task preview only, with full-scope totals, sessions, and matching export filters', () => {
    const html = renderToStaticMarkup(<ReportsView snapshot={snapshot} />);
    expect(html).toContain('27 matching tasks');
    expect(html).toContain('Task 25');
    expect(html).toContain('Task 26');
    expect(html).not.toContain('Task 24</');
    expect(html.match(/<tr\b/g)).toHaveLength(5);
    expect(html).toContain('Tracked task time');
    expect(html).toContain('Unique working time');
    expect(html).toContain('Overlapping tracked time');
    expect(html).toContain('Session details');
    expect(html).toContain('Corrected');
    expect(html).toContain(
      'href="/reports/export?from=2026-09-01&amp;to=2026-09-28&amp;taskState=ALL&amp;correctionState=CORRECTED"'
    );
    expect(html).toContain(
      'href="/reports?from=2026-09-01&amp;to=2026-09-28&amp;taskState=ALL&amp;correctionState=CORRECTED&amp;page=1"'
    );
    expect(html).toContain('Current task state');
    expect(html.match(/<caption\b/g)).toHaveLength(2);
  });

  it('shows useful empty guidance while keeping the selected filters', () => {
    const html = renderToStaticMarkup(
      <ReportsView
        snapshot={{
          ...snapshot,
          taskRows: [],
          sessionRows: [],
          facts: {
            ...snapshot.facts,
            trackedSeconds: 0,
            uniqueWorkingSeconds: 0,
            overlapSeconds: 0,
          },
        }}
      />
    );
    expect(html).toContain('No planned or tracked tasks match these filters.');
    expect(html).toContain('No sessions match these filters.');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('name="correctionState"');
  });

  it('preserves invalid fields and disables download', () => {
    const html = renderToStaticMarkup(
      <ReportsView
        values={{
          from: 'bad-date',
          to: '2026-09-28',
          projectId: '',
          taskState: 'PAUSED',
          correctionState: 'CORRECTED',
          page: '1',
        }}
        errors={{ from: 'Enter a real date.' }}
        ownedProjects={[]}
      />
    );
    expect(html).toContain('value="bad-date"');
    expect(html).toContain('aria-describedby="reports-from-error"');
    expect(html).toContain('Enter a real date.');
    expect(html).not.toContain('href="/reports/export');
  });

  it('retains an invalid page value in a labeled, correctable field', () => {
    const html = renderToStaticMarkup(
      <ReportsView
        values={{
          from: '2026-09-01',
          to: '2026-09-28',
          projectId: '',
          taskState: 'ALL',
          correctionState: 'ALL',
          page: 'bad-page',
        }}
        errors={{ page: 'Enter a positive page number.' }}
        ownedProjects={[]}
      />
    );
    expect(html).toContain('name="page"');
    expect(html).toContain('value="bad-page"');
    expect(html).toContain('aria-describedby="reports-page-error"');
    expect(html).toContain('id="reports-page-error"');
    expect(html).toContain('Enter a positive page number.');
    expect(html).not.toContain('href="/reports/export');
  });
});
