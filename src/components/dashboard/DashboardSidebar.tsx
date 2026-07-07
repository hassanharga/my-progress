'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Settings as SettingsIcon,
  PanelLeftClose,
} from 'lucide-react';

import { useUserContext } from '@/contexts/user.context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import { Settings } from '@/components/shared/Settings';

type NavItem = {
  icon: typeof ClipboardList;
  label: string;
  href?: string;
  action?: string;
};

const navItems: NavItem[] = [
  { icon: ClipboardList, label: 'Tasks', href: '/dashboard' },
  { icon: SettingsIcon, label: 'Settings', action: 'settings' },
];

export default function DashboardSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const { user, refetchUser } = useUserContext();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  const handleNavClick = (item: NavItem) => {
    if (item.action === 'settings') {
      setSettingsOpen(true);
      onMobileClose();
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex h-16 items-center border-b ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-bold text-sm font-weight-bold text-text-inverse">
            M
          </div>
          {!collapsed && <span className="text-base font-weight-semibold">My Progress</span>}
        </div>
      </div>

      {/* Project/Company switcher (hidden when collapsed) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full cursor-pointer items-center gap-075 rounded-md px-075 py-050 text-left hover:bg-neutral-subtle-hovered transition-colors">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-container">
                  <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-body font-weight-medium text-text">
                    {user?.currentProject || 'No project'}
                  </p>
                  {(user?.currentCompany || user?.currentProject) && (
                    <p className="truncate text-body-small text-text-subtlest">
                      {user?.currentCompany || 'No company'}
                    </p>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-icon-subtle" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="w-56">
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-075">
                  <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
                  <span className="text-body-small text-text-subtlest">Project</span>
                </div>
                <p className="truncate text-body font-weight-medium text-text pl-6">
                  {user?.currentProject || 'Not set'}
                </p>
              </div>
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-075">
                  <Building2 className="h-3.5 w-3.5 text-icon-subtle" />
                  <span className="text-body-small text-text-subtlest">Company</span>
                </div>
                <p className="truncate text-body font-weight-medium text-text pl-6">
                  {user?.currentCompany || 'Not set'}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setSettingsOpen(true); onMobileClose(); }}
                className="cursor-pointer"
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Edit project settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-200 pb-050">
          <span className="text-body-small text-text-subtlest">Navigation</span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 space-y-050 p-3">
        {navItems.map((item) => {
          const isActive = item.href === pathname;
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={`flex w-full cursor-pointer items-center gap-075 rounded-md px-075 py-075 text-body font-weight-medium transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-selected text-text-selected'
                  : 'text-text-subtle hover:bg-neutral-subtle-hovered hover:text-text'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden border-t p-3 md:block">
        <button
          onClick={toggleCollapsed}
          className="flex w-full cursor-pointer items-center gap-075 rounded-md px-075 py-075 text-body text-text-subtle hover:bg-neutral-subtle-hovered hover:text-text"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Settings Dialog */}
      {settingsOpen && (
        <Settings
          weekStartDay={user?.weekStartDay ?? 'MONDAY'}
          refetch={refetchUser}
          open={settingsOpen}
          setOpen={setSettingsOpen}
        />
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden shrink-0 border-r bg-surface transition-all duration-300 md:block ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
