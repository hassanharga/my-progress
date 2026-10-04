import Link from 'next/link';
import { BarChart3, CalendarCheck2, Ellipsis, FolderOpen } from 'lucide-react';

import { paths } from '@/paths';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { getNavigationForPlacement, isReportsPath, isSettingsPath, type NavigationPlacement } from './navigation';

type ApplicationNavigationProps = {
  pathname: string;
  placement: NavigationPlacement;
};

const placementClassNames: Record<NavigationPlacement, string> = {
  wide: 'dashboard-navigation-wide',
  medium: 'dashboard-navigation-medium',
  narrow: 'dashboard-navigation-narrow',
};

export default function ApplicationNavigation({ pathname, placement }: ApplicationNavigationProps) {
  const items = getNavigationForPlacement(placement);
  const isNarrow = placement === 'narrow';
  const isMedium = placement === 'medium';

  const navigation = (
    <nav aria-label={isNarrow ? 'Mobile primary' : 'Primary'} className={placementClassNames[placement]}>
      {!isNarrow ? (
        <div className="dashboard-navigation-brand" aria-label="My Progress">
          <span aria-hidden="true" className="dashboard-navigation-mark">
            M
          </span>
          {!isMedium ? (
            <span className="leading-tight">
              <span className="block text-body-small font-weight-semibold uppercase tracking-[0.16em] text-text-subtlest">
                My
              </span>
              <span className="block font-heading text-heading-xsmall text-text">Progress</span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={isNarrow ? 'dashboard-navigation-items-mobile' : 'dashboard-navigation-items'}>
        {items.map((item) => {
          const current = item.isActive(pathname);
          const Icon = item.icon === 'today' ? CalendarCheck2 : item.icon === 'projects' ? FolderOpen : BarChart3;
          const link = (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current ? 'page' : undefined}
              aria-label={isMedium ? item.label : undefined}
              className="dashboard-navigation-link"
              data-current={current ? 'true' : undefined}
            >
              <Icon className="size-5" aria-hidden="true" />
              {!isMedium || isNarrow ? <span>{item.label}</span> : null}
            </Link>
          );

          if (!isMedium) return link;

          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
        {isNarrow ? (
          <details className="dashboard-navigation-more">
            <summary
              className="dashboard-navigation-link"
              data-current={isReportsPath(pathname) || isSettingsPath(pathname) ? 'true' : undefined}
              aria-label={
                isSettingsPath(pathname)
                  ? 'More, Settings current'
                  : isReportsPath(pathname)
                    ? 'More, Reports current'
                    : 'More'
              }
            >
              <Ellipsis className="size-5" aria-hidden="true" />
              <span>More</span>
            </summary>
            <div className="dashboard-navigation-more-panel">
              <Link
                href={paths.reports}
                className="dashboard-navigation-more-link"
                aria-current={isReportsPath(pathname) ? 'page' : undefined}
              >
                Reports
              </Link>
              <Link
                href={paths.settings}
                className="dashboard-navigation-more-link"
                aria-current={isSettingsPath(pathname) ? 'page' : undefined}
              >
                Settings
              </Link>
            </div>
          </details>
        ) : null}
      </div>
    </nav>
  );

  return isMedium ? <TooltipProvider>{navigation}</TooltipProvider> : navigation;
}
