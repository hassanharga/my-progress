import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dashboardPageSource = readFileSync(resolve(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
const cockpitSource = readFileSync(resolve(process.cwd(), 'src/components/today/TodayCockpit.tsx'), 'utf8');

describe('Today dashboard integration contract', () => {
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
