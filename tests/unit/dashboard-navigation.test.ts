import {
  getNavigationForPlacement,
  isReportsPath,
  isSettingsPath,
  PRIMARY_NAVIGATION,
} from '@/components/dashboard/navigation';

describe('dashboard navigation', () => {
  it('matches Settings at a segment boundary only', () => {
    expect(isSettingsPath('/settings')).toBe(true);
    expect(isSettingsPath('/settings/preferences')).toBe(true);
    expect(isSettingsPath('/settings-old')).toBe(false);
  });
  it('exposes Today, Projects, and Insights primary destinations', () => {
    expect(PRIMARY_NAVIGATION.map(({ key, label, href }) => ({ key, label, href }))).toEqual([
      { key: 'today', label: 'Today', href: '/dashboard' },
      { key: 'projects', label: 'Projects', href: '/projects' },
      { key: 'insights', label: 'Insights', href: '/insights' },
    ]);
  });

  it.each(['wide', 'medium', 'narrow'] as const)(
    'places Insights with Today and Projects in %s navigation',
    (placement) => {
      expect(getNavigationForPlacement(placement).map((item) => item.key)).toEqual(['today', 'projects', 'insights']);
    }
  );

  it.each([
    ['/dashboard', true],
    ['/dashboard/', true],
    ['/dashboard/tasks', true],
    ['/projects', false],
    ['/login', false],
  ] as const)('matches %s as active=%s', (pathname, expected) => {
    expect(PRIMARY_NAVIGATION[0].isActive(pathname)).toBe(expected);
  });

  it.each([
    ['/projects', true],
    ['/projects/', true],
    ['/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true],
    ['/projects-archive', false],
    ['/dashboard', false],
  ] as const)('matches Projects at %s as active=%s', (pathname, expected) => {
    expect(PRIMARY_NAVIGATION[1].isActive(pathname)).toBe(expected);
  });

  it.each([
    ['/insights', true],
    ['/insights/', true],
    ['/insights/detail', true],
    ['/reports', false],
    ['/insights-old', false],
  ] as const)('matches Insights at %s as active=%s', (pathname, expected) => {
    expect(PRIMARY_NAVIGATION[2].isActive(pathname)).toBe(expected);
  });

  it.each([
    ['/reports', true],
    ['/reports/', true],
    ['/reports/export', true],
    ['/reports-old', false],
    ['/insights', false],
  ] as const)('matches Reports at %s as active=%s', (pathname, expected) => {
    expect(isReportsPath(pathname)).toBe(expected);
  });
});
