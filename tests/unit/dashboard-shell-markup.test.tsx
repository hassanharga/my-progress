import { renderToStaticMarkup } from 'react-dom/server';

import { DashboardShellFrame } from '@/components/dashboard/DashboardShell';
import DashboardTopBar from '@/components/dashboard/DashboardTopBar';

jest.mock('@/contexts/user.context', () => ({
  useUserContext: () => ({
    user: { currentProjectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Example User' },
    logout: jest.fn(),
    refetchUser: jest.fn(),
  }),
}));
jest.mock('next-themes', () => ({ useTheme: () => ({ setTheme: jest.fn(), theme: 'system' }) }));
jest.mock('@/components/dashboard/ProjectSwitcher', () => () => <div>Project switcher</div>);
jest.mock('@/components/shared/Settings', () => ({ Settings: () => null }));

describe('DashboardShellFrame', () => {
  it('does not offer an inert global Create task control on project routes', () => {
    const html = renderToStaticMarkup(<DashboardTopBar />);

    expect(html).toContain('Project switcher');
    expect(html).not.toContain('Create task');
  });

  it('renders the skip target, named navigation regions, and current page', () => {
    const html = renderToStaticMarkup(
      <DashboardShellFrame pathname="/dashboard" topBar={<div>Toolbar</div>}>
        <h1>Today</h1>
      </DashboardShellFrame>
    );

    expect(html).toContain('href="#dashboard-main-content"');
    expect(html).toContain('id="dashboard-main-content"');
    expect(html).toContain('aria-label="Primary"');
    expect(html).toContain('aria-label="Mobile primary"');
    expect(html).toContain('aria-current="page"');
  });

  it('renders Today, Projects, and Insights in all navigation placements with Today current', () => {
    const html = renderToStaticMarkup(
      <DashboardShellFrame pathname="/dashboard" topBar={<div>Toolbar</div>}>
        <h1>Today</h1>
      </DashboardShellFrame>
    );

    expect(html.match(/href="\/dashboard"/g)).toHaveLength(3);
    expect(html.match(/href="\/projects"/g)).toHaveLength(3);
    expect(html.match(/href="\/insights"/g)).toHaveLength(3);
    expect(
      html.match(/<a\b[^>]*href="\/dashboard"[^>]*>/g)?.every((link) => link.includes('aria-current="page"'))
    ).toBe(true);
    expect(html).toContain('href="/reports"');
    expect(html).toContain('href="/settings"');
  });

  it('marks Projects current in all placements for a project workspace', () => {
    const html = renderToStaticMarkup(
      <DashboardShellFrame pathname="/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" topBar={<div>Toolbar</div>}>
        <h1>Project workspace</h1>
      </DashboardShellFrame>
    );

    expect(html.match(/<a\b[^>]*href="\/projects"[^>]*>/g)).toHaveLength(3);
    expect(html.match(/<a\b[^>]*href="\/projects"[^>]*>/g)?.every((link) => link.includes('aria-current="page"'))).toBe(
      true
    );
    expect(
      html.match(/<a\b[^>]*href="\/dashboard"[^>]*>/g)?.every((link) => !link.includes('aria-current="page"'))
    ).toBe(true);
    expect(html).toContain('aria-label="Projects"');
  });
});
