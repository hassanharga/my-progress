import { renderToStaticMarkup } from 'react-dom/server';

import ApplicationNavigation from '../../src/components/dashboard/ApplicationNavigation';
import DashboardTopBar from '../../src/components/dashboard/DashboardTopBar';
import SettingsView from '../../src/components/settings/SettingsView';
import type { AccountProfile } from '../../src/types/user';

let mockUser: AccountProfile | null = null;
beforeEach(() => {
  mockUser = null;
});

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }));
jest.mock('../../src/actions/user', () => ({ updateSettings: jest.fn() }));
jest.mock('../../src/actions/project', () => ({ getProjects: jest.fn(), switchProject: jest.fn() }));
jest.mock('../../src/contexts/user.context', () => ({
  useUserContext: () => ({
    user: mockUser,
    userLoading: false,
    userLoadFailed: false,
    refetchUser: jest.fn(),
    setUserData: jest.fn(),
    logout: jest.fn(),
  }),
}));
jest.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ execute: jest.fn(), isPending: false, isExecuting: false, result: {} }),
}));
jest.mock('next-themes', () => ({ useTheme: () => ({ theme: 'system', setTheme: jest.fn() }) }));
const profile = {
  id: 'owner',
  name: 'Owner',
  email: 'owner@example.test',
  currentProjectId: null,
  currentProject: null,
  timezone: 'Pacific/Honolulu',
  weekStartDay: 'SATURDAY' as const,
  dailyCapacityMinutes: 0,
};
it('gives Settings its own responsive outer padding without changing the shared shell', () => {
  const html = renderToStaticMarkup(<SettingsView profile={profile} />);
  const outerClasses = html.match(/^<div class="([^"]*)"/)?.[1].split(' ');
  expect(outerClasses).toEqual(expect.arrayContaining(['p-4', 'sm:p-6', 'min-w-0', 'w-full']));
});
it('renders the hierarchy, authoritative values, readonly identity and browser-only appearance', () => {
  const html = renderToStaticMarkup(<SettingsView profile={profile} />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).not.toContain('<main');
  expect(html).toContain('value="Pacific/Honolulu"');
  expect(html).toContain('value="0"');
  expect(html).toContain('value="SATURDAY" selected=""');
  expect(html).toContain('This browser');
  expect(html).toContain('owner@example.test');
  expect(html).not.toContain('name="email"');
  expect(html).not.toContain('name="name"');
  expect(html).toContain('href="/projects"');
  expect(html).toContain('Save preferences');
  expect(html.indexOf('Changing your timezone')).toBeLessThan(html.indexOf('Save preferences'));
});
it('marks Settings current in More without losing Reports', () => {
  const html = renderToStaticMarkup(<ApplicationNavigation placement="narrow" pathname="/settings" />);
  expect(html).toContain('More, Settings current');
  expect(html).toContain('href="/reports"');
  expect(html.match(/<a\b[^>]*href="\/settings"[^>]*>/)?.[0]).toContain('aria-current="page"');
});
it('exposes the empty-project action as the Settings destination', () => {
  const html = renderToStaticMarkup(<DashboardTopBar />);
  expect(html).toContain('href="/settings"');
});
it('does not replace a known active project with first-use setup while the project list loads', () => {
  mockUser = { ...profile, currentProjectId: 'project', currentProject: { id: 'project', name: 'Research' } };
  const html = renderToStaticMarkup(<DashboardTopBar />);
  expect(html).toContain('Current project: Research');
  expect(html).not.toContain('Set up your projects');
});
