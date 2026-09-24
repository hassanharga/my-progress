import { getNavigationForPlacement, PRIMARY_NAVIGATION } from '@/components/dashboard/navigation';

describe('dashboard navigation', () => {
  it('exposes Today and Projects destinations', () => {
    expect(PRIMARY_NAVIGATION.map(({ key, label, href }) => ({ key, label, href }))).toEqual([
      { key: 'today', label: 'Today', href: '/dashboard' },
      { key: 'projects', label: 'Projects', href: '/projects' },
    ]);
  });

  it.each(['wide', 'medium', 'narrow'] as const)('places Today and Projects in %s navigation', (placement) => {
    expect(getNavigationForPlacement(placement).map((item) => item.key)).toEqual(['today', 'projects']);
  });

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
});
