import { renderToStaticMarkup } from 'react-dom/server';

import FirstProjectForm from '../../src/components/onboarding/FirstProjectForm';
import FirstUseToday from '../../src/components/onboarding/FirstUseToday';
import type { TodayViewModel } from '../../src/server/today/today-types';
import type { AccountProfile } from '../../src/types/user';

jest.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ execute: jest.fn(), executeAsync: jest.fn(), isPending: false }),
}));
jest.mock('../../src/actions/project', () => ({ createFirstProject: jest.fn() }));
jest.mock('../../src/actions/today', () => ({
  createTodayTask: jest.fn(),
  mutateToday: jest.fn(),
  transitionTodayTask: jest.fn(),
}));
jest.mock('../../src/contexts/user.context', () => ({ useUserContext: () => ({ setUserData: jest.fn() }) }));
export const today: TodayViewModel = {
  backlog: [],
  carryover: [],
  focus: null,
  generatedAt: '2026-10-04T00:30:00Z',
  items: [],
  planDate: '2026-10-03',
  projects: [],
  revision: 0,
  runningIndicators: [],
  summary: { actualSeconds: 0, cancelledCount: 0, completedCount: 0, openCount: 0, totalCount: 0 },
  timezone: 'Pacific/Honolulu',
  workload: {
    actualSeconds: 0,
    capacityMinutes: null,
    plannedMinutes: 0,
    remainingMinutes: null,
    state: 'unset',
    utilizationPercent: null,
  },
};
export const profile: AccountProfile = {
  id: 'owner',
  name: 'Owner',
  email: 'owner@example.test',
  currentProjectId: null,
  currentProject: null,
  timezone: 'Pacific/Honolulu',
  weekStartDay: 'MONDAY',
  dailyCapacityMinutes: null,
};
it('shows stored timezone and first-project controls without premature task controls', () => {
  const html = renderToStaticMarkup(
    <FirstUseToday
      initialToday={today}
      profile={profile}
      firstUse={{ activeProjectCount: 0, archivedProjectCount: 0, taskCount: 0 }}
    />
  );
  expect(html).toContain('Pacific/Honolulu');
  expect(html).toContain('Project name');
  expect(html).toContain('href="/settings"');
  expect(html).not.toContain('Create and plan a task');
  expect(html).not.toContain('Today’s order');
});
it('offers archived-project recovery without pretending there are no stored projects', () => {
  const html = renderToStaticMarkup(
    <FirstUseToday
      initialToday={today}
      profile={profile}
      firstUse={{ activeProjectCount: 0, archivedProjectCount: 2, taskCount: 3 }}
    />
  );
  expect(html).toContain('archived projects');
  expect(html).toContain('href="/projects"');
  expect(html).toContain('Create a new project');
});
it('preserves the normal cockpit and omits setup for returning users', () => {
  const html = renderToStaticMarkup(
    <FirstUseToday
      initialToday={{ ...today, projects: [{ id: 'project', name: 'Saved project' }] }}
      profile={profile}
      firstUse={{ activeProjectCount: 1, archivedProjectCount: 0, taskCount: 2 }}
    />
  );
  expect(html).toContain('Today’s order');
  expect(html).not.toContain('Project name');
  expect(html).not.toContain('Set up your daily plan');
});
it('renders semantic bounded project input and honest save action', () => {
  const html = renderToStaticMarkup(<FirstProjectForm onSaved={() => undefined} />);
  expect(html).toContain('for="first-project-name"');
  expect(html).toContain('maxLength="80"');
  expect(html).toContain('Create project');
});
