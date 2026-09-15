import {
  PRIMARY_NAVIGATION,
  getNavigationForPlacement,
} from '@/components/dashboard/navigation';

describe('dashboard navigation', () => {
  it('exposes only the working Today destination', () => {
    expect(PRIMARY_NAVIGATION.map(({ key, label, href }) => ({ key, label, href }))).toEqual([
      { key: 'today', label: 'Today', href: '/dashboard' },
    ]);
  });

  it.each(['wide', 'medium', 'narrow'] as const)('places Today in %s navigation', (placement) => {
    expect(getNavigationForPlacement(placement).map((item) => item.key)).toEqual(['today']);
  });

  it.each([
    ['/dashboard', true],
    ['/dashboard/', true],
    ['/dashboard/tasks', true],
    ['/login', false],
  ] as const)('matches %s as active=%s', (pathname, expected) => {
    expect(PRIMARY_NAVIGATION[0].isActive(pathname)).toBe(expected);
  });
});
