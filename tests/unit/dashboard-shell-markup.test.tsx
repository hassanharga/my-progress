import { renderToStaticMarkup } from 'react-dom/server';

import { DashboardShellFrame } from '@/components/dashboard/DashboardShell';

describe('DashboardShellFrame', () => {
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

  it('renders only Today as a route destination', () => {
    const html = renderToStaticMarkup(
      <DashboardShellFrame pathname="/dashboard" topBar={<div>Toolbar</div>}>
        <h1>Today</h1>
      </DashboardShellFrame>
    );

    expect(html.match(/href="\/dashboard"/g)).toHaveLength(3);
    expect(html).not.toMatch(/Projects|Insights|Reports/);
  });
});
