import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { ReportingSnapshot } from '@/server/reporting/read-reporting';
import { renderToStaticMarkup } from 'react-dom/server';

import { InsightsScopeForm } from '@/components/insights/InsightsScopeForm';
import { InsightsView } from '@/components/insights/InsightsView';

const snapshot: ReportingSnapshot = {
  query: { from: '2026-09-01', to: '2026-09-28', projectId: null, taskState: 'ALL', correctionState: 'ALL', page: 1 },
  timezone: 'UTC',
  weekStartDay: 'MONDAY',
  generatedAt: new Date('2026-09-28T12:00:00Z'),
  ownedProjects: [{ id: 'project-1', name: 'Writing', archived: false }],
  facts: {
    plannedMinutes: 60,
    missingEstimateCount: 1,
    plannedTaskSeconds: 4500,
    missingEstimateWorkedSeconds: 0,
    unplannedSeconds: 900,
    trackedSeconds: 5400,
    uniqueWorkingSeconds: 4800,
    overlapSeconds: 600,
    varianceSeconds: 900,
    overrunCount: 1,
    sessionSplitCount: 2,
    daily: [
      {
        date: '2026-09-28',
        plannedMinutes: 60,
        missingEstimateCount: 1,
        plannedTaskSeconds: 4500,
        missingEstimateWorkedSeconds: 0,
        unplannedSeconds: 900,
        trackedSeconds: 5400,
        uniqueWorkingSeconds: 4800,
        overlapSeconds: 600,
        varianceSeconds: 900,
        overrunCount: 1,
        sessionSplitCount: 2,
      },
    ],
    weekly: [
      {
        weekStart: '2026-09-28',
        plannedMinutes: 60,
        missingEstimateCount: 1,
        plannedTaskSeconds: 4500,
        missingEstimateWorkedSeconds: 0,
        unplannedSeconds: 900,
        trackedSeconds: 5400,
        uniqueWorkingSeconds: 4800,
        overlapSeconds: 600,
        varianceSeconds: 900,
        overrunCount: 1,
        sessionSplitCount: 2,
      },
    ],
    projects: [
      {
        projectId: 'project-1',
        projectName: 'Writing',
        trackedSeconds: 5400,
        uniqueWorkingSeconds: 5400,
        sessionCount: 3,
        sessionSplitCount: 2,
      },
    ],
  },
  taskRows: [],
  sessionRows: [],
};

describe('Insights markup', () => {
  it('shows Monday 0, Tuesday 1, and matching week 1 in labeled review table columns', () => {
    const monday = { ...snapshot.facts.daily[0], date: '2026-09-28', sessionSplitCount: 0 };
    const tuesday = { ...snapshot.facts.daily[0], date: '2026-09-29', sessionSplitCount: 1 };
    const week = { ...snapshot.facts.weekly[0], weekStart: '2026-09-28', sessionSplitCount: 1 };
    const html = renderToStaticMarkup(
      <InsightsView
        snapshot={{ ...snapshot, facts: { ...snapshot.facts, daily: [monday, tuesday], weekly: [week] } }}
      />
    );
    const daily = html.match(/<section aria-label="Daily review"[\s\S]*?<\/section>/)?.[0] ?? '';
    const weekly = html.match(/<section aria-label="Weekly review"[\s\S]*?<\/section>/)?.[0] ?? '';
    const dailyRows = [...daily.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) =>
      match[1].replace(/<[^>]*>/g, '')
    );
    const weeklyRows = [...weekly.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) =>
      match[1].replace(/<[^>]*>/g, '')
    );
    expect(dailyRows[0]).toContain('Session splits or resumptions');
    expect(weeklyRows[0]).toContain('Session splits or resumptions');
    expect(dailyRows[1]).toMatch(/Sep 28, 2026.*0$/);
    expect(dailyRows[2]).toMatch(/Sep 29, 2026.*1$/);
    expect(weeklyRows[1]).toMatch(/Sep 28, 2026.*1$/);
  });

  it('shows literal measures, an overlap explanation, and accessible chart/table pairs', () => {
    const html = renderToStaticMarkup(<InsightsView snapshot={snapshot} />);
    expect(html).toContain('Planned');
    expect(html).toContain('Worked on planned tasks');
    expect(html).toContain('Variance');
    expect(html).toContain('Unplanned work');
    expect(html).toContain('Tracked task time');
    expect(html).toContain('Unique working time');
    expect(html).toContain('Overlapping tracked time');
    expect(html).toContain('Without an estimate');
    expect(html).toContain('Session splits or resumptions');
    expect(html).not.toMatch(/accuracy score|distraction/i);
    expect(html.match(/<table\b/g)).toHaveLength(3);
    expect(html.match(/<caption\b/g)).toHaveLength(3);
    expect(html.match(/role="img"/g)).toHaveLength(3);
    expect(html).toContain('href="/reports?from=2026-09-01&amp;to=2026-09-28"');
  });

  it('preserves the GET scope form and gives a useful empty state', () => {
    const empty: ReportingSnapshot = {
      ...snapshot,
      facts: {
        ...snapshot.facts,
        plannedMinutes: 0,
        missingEstimateCount: 0,
        plannedTaskSeconds: 0,
        missingEstimateWorkedSeconds: 0,
        unplannedSeconds: 0,
        trackedSeconds: 0,
        uniqueWorkingSeconds: 0,
        overlapSeconds: 0,
        varianceSeconds: 0,
        overrunCount: 0,
        sessionSplitCount: 0,
        daily: [],
        weekly: [],
        projects: [],
      },
    };
    const html = renderToStaticMarkup(<InsightsView snapshot={empty} />);
    expect(html).toContain('No planned or tracked work matches this scope.');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="from"');
    expect(html).toContain('name="to"');
    expect(html).toContain('name="projectId"');
  });

  it('retains invalid values and connects each error to its field', () => {
    const html = renderToStaticMarkup(
      <InsightsView
        values={{ from: 'bad-date', to: '2026-09-01', projectId: '' }}
        errors={{ from: 'Enter a real date in YYYY-MM-DD format.' }}
        ownedProjects={snapshot.ownedProjects}
      />
    );
    expect(html).toContain('value="bad-date"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="insights-from-error"');
    expect(html).toContain('Enter a real date in YYYY-MM-DD format.');
  });

  it('keeps GET scope fields editable while retaining raw invalid values', () => {
    const form = InsightsScopeForm({
      values: { from: 'bad-date', to: '2026-09-28', projectId: 'project-1' },
      ownedProjects: snapshot.ownedProjects,
    });
    const descendants = (
      node: ReactNode
    ): ReactElement<{ children?: ReactNode; name?: string; value?: string; defaultValue?: string }>[] =>
      Children.toArray(node).flatMap((child) => {
        if (!isValidElement<{ children?: ReactNode; name?: string; value?: string; defaultValue?: string }>(child))
          return [];
        return [child, ...descendants(child.props.children)];
      });
    const fields = descendants(form).filter((element) =>
      ['from', 'to', 'projectId'].includes(element.props.name ?? '')
    );
    expect(fields.map((field) => [field.props.name, field.props.defaultValue])).toEqual([
      ['from', 'bad-date'],
      ['to', '2026-09-28'],
      ['projectId', 'project-1'],
    ]);
    expect(fields.every((field) => field.props.value === undefined)).toBe(true);
  });
});
