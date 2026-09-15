export type NavigationPlacement = 'wide' | 'medium' | 'narrow';

export type NavigationItem = Readonly<{
  key: 'today';
  label: string;
  href: '/dashboard';
  icon: 'today';
  placements: readonly NavigationPlacement[];
  isActive: (pathname: string) => boolean;
}>;

const isDashboardPath = (pathname: string): boolean =>
  pathname === '/dashboard' || pathname === '/dashboard/' || pathname.startsWith('/dashboard/');

export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  {
    key: 'today',
    label: 'Today',
    href: '/dashboard',
    icon: 'today',
    placements: ['wide', 'medium', 'narrow'],
    isActive: isDashboardPath,
  },
];

export const getNavigationForPlacement = (placement: NavigationPlacement): readonly NavigationItem[] =>
  PRIMARY_NAVIGATION.filter((item) => item.placements.includes(placement));
