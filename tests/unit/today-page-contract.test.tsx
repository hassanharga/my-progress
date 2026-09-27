import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { TodayCockpit } from '@/components/today/TodayCockpit';
import type { TodayViewModel } from '@/server/today/today-types';

jest.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: jest.fn() }) }));
jest.mock('@/actions/today', () => ({ createTodayTask: jest.fn(), mutateToday: jest.fn(), transitionTodayTask: jest.fn() }));

const dashboardPageSource = readFileSync(resolve(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
const cockpitSource = readFileSync(resolve(process.cwd(), 'src/components/today/TodayCockpit.tsx'), 'utf8');

describe('Today dashboard integration contract', () => {
  it('places the day summary before the task order in the rendered page', () => {
    const today: TodayViewModel = {
      backlog: [],
      carryover: [],
      focus: null,
      generatedAt: '2026-09-27T09:00:00.000Z',
      items: [],
      planDate: '2026-09-27',
      projects: [],
      revision: 0,
      runningIndicators: [],
      summary: { actualSeconds: 0, cancelledCount: 0, completedCount: 0, openCount: 0, totalCount: 0 },
      timezone: 'UTC',
      workload: { actualSeconds: 0, capacityMinutes: null, plannedMinutes: 0, remainingMinutes: null, state: 'unset', utilizationPercent: null },
    };
    const html = renderToStaticMarkup(<TodayCockpit initialToday={today} />);
    expect(html.indexOf('Day summary')).toBeGreaterThan(html.indexOf('Daily workload'));
    expect(html.indexOf('Day summary')).toBeLessThan(html.indexOf('Today’s order'));
  });
  it('loads the owner-scoped cross-project read model without a current-project gate', () => {
    expect(dashboardPageSource).toContain('validateUserToken()');
    expect(dashboardPageSource).toContain('readTodayForOwner({');
    expect(dashboardPageSource).toContain('ownerId: user.id!');
    expect(dashboardPageSource).toContain('prisma: db');
    expect(dashboardPageSource).not.toContain('currentProjectId');
    expect(dashboardPageSource).not.toContain('getTasksListData');
    expect(dashboardPageSource).not.toContain('TaskProvider');
  });

  it('passes the serializable Today snapshot across the server-client boundary', () => {
    expect(dashboardPageSource).toContain('<TodayCockpit initialToday={today} />');
    expect(dashboardPageSource).not.toContain('JSON.stringify');
    expect(cockpitSource).toContain('Date.parse(state.today.generatedAt)');
  });

  it('composes each reviewed cockpit region once', () => {
    for (const component of [
      'TodayHeader',
      'TodayClockProvider',
      'FocusDock',
      'RunningProjectIndicators',
      'CarryoverReview',
      'TodayList',
      'DailySummary',
    ]) {
      expect(cockpitSource.match(new RegExp(`<${component}\\b`, 'g'))).toHaveLength(1);
    }
    expect(cockpitSource).not.toContain('<ol aria-label="Today plan"');
  });

  it('keeps first-use recovery and unavailable progress logging truthful', () => {
    expect(cockpitSource).toContain('Create a project from the project switcher');
    expect(cockpitSource).toContain('Progress logging is not available yet. No changes were made.');
  });
});
