import { paths } from '@/paths';

export type NavigationPlacement = 'wide' | 'medium' | 'narrow';

export type NavigationItem = Readonly<{
  key: 'today' | 'projects';
  label: string;
  href: typeof paths.dashboard | typeof paths.projects;
  icon: 'today' | 'projects';
  placements: readonly NavigationPlacement[];
  isActive: (pathname: string) => boolean;
}>;

const isDashboardPath = (pathname: string): boolean =>
  pathname === paths.dashboard || pathname === `${paths.dashboard}/` || pathname.startsWith(`${paths.dashboard}/`);

const isProjectsPath = (pathname: string): boolean =>
  pathname === paths.projects || pathname === `${paths.projects}/` || pathname.startsWith(`${paths.projects}/`);

export const PRIMARY_NAVIGATION: readonly NavigationItem[] = [
  {
    key: 'today',
    label: 'Today',
    href: paths.dashboard,
    icon: 'today',
    placements: ['wide', 'medium', 'narrow'],
    isActive: isDashboardPath,
  },
  {
    key: 'projects',
    label: 'Projects',
    href: paths.projects,
    icon: 'projects',
    placements: ['wide', 'medium', 'narrow'],
    isActive: isProjectsPath,
  },
];

export const getNavigationForPlacement = (placement: NavigationPlacement): readonly NavigationItem[] =>
  PRIMARY_NAVIGATION.filter((item) => item.placements.includes(placement));
