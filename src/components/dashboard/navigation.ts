import { paths } from '@/paths';

export type NavigationPlacement = 'wide' | 'medium' | 'narrow';

export type NavigationItem = Readonly<{
  key: 'today' | 'projects' | 'insights';
  label: string;
  href: typeof paths.dashboard | typeof paths.projects | typeof paths.insights;
  icon: 'today' | 'projects' | 'insights';
  placements: readonly NavigationPlacement[];
  isActive: (pathname: string) => boolean;
}>;

const isDashboardPath = (pathname: string): boolean =>
  pathname === paths.dashboard || pathname === `${paths.dashboard}/` || pathname.startsWith(`${paths.dashboard}/`);

const isProjectsPath = (pathname: string): boolean =>
  pathname === paths.projects || pathname === `${paths.projects}/` || pathname.startsWith(`${paths.projects}/`);

const isInsightsPath = (pathname: string): boolean =>
  pathname === paths.insights || pathname === `${paths.insights}/` || pathname.startsWith(`${paths.insights}/`);

export const isReportsPath = (pathname: string): boolean =>
  pathname === paths.reports || pathname === `${paths.reports}/` || pathname.startsWith(`${paths.reports}/`);

export const isSettingsPath = (pathname: string): boolean =>
  pathname === paths.settings || pathname.startsWith(`${paths.settings}/`);

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
  {
    key: 'insights',
    label: 'Insights',
    href: paths.insights,
    icon: 'insights',
    placements: ['wide', 'medium', 'narrow'],
    isActive: isInsightsPath,
  },
];

export const getNavigationForPlacement = (placement: NavigationPlacement): readonly NavigationItem[] =>
  PRIMARY_NAVIGATION.filter((item) => item.placements.includes(placement));
