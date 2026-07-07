'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Settings as SettingsIcon,
  PanelLeftClose,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { getProjects, switchProject, type ProjectListItem } from '@/actions/project';
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

function ProjectSwitcher({ onManageProjects }: { onManageProjects: () => void }) {
  const { user, refetchUser } = useUserContext();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  const { execute: loadProjects } = useAction(getProjects, {
    onSuccess: ({ data }) => {
      if (data) setProjects(data);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to load projects'),
  });

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { execute: executeSwitch } = useAction(switchProject, {
    onSuccess: () => {
      refetchUser();
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to switch project'),
  });

  const activeId = user?.currentProjectId;
  const activeName = user?.currentProject?.name;
  const activeProjects = projects.filter((p) => !p.archived);

  const triggerLabel = activeName ?? (activeProjects.length === 0 ? 'Create a project' : 'Select project');

  // No projects at all -> open settings directly when the trigger is clicked
  const handleTriggerClick = () => {
    if (activeProjects.length === 0) {
      onManageProjects();
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) loadProjects(); }}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full cursor-pointer items-center gap-075 rounded-md px-075 py-050 text-left hover:bg-neutral-subtle-hovered transition-colors"
          onClick={handleTriggerClick}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-container">
            <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`truncate text-body font-weight-medium ${activeName ? 'text-text' : 'text-text-subtle'}`}>
              {triggerLabel}
            </p>
          </div>
          {activeProjects.length > 0 && <ChevronDown className="h-4 w-4 shrink-0 text-icon-subtle" />}
        </button>
      </DropdownMenuTrigger>
      {activeProjects.length > 0 && (
        <DropdownMenuContent side="bottom" align="start" className="w-56">
          {activeProjects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => executeSwitch({ id: p.id })}
              className={`cursor-pointer ${p.id === activeId ? 'bg-selected text-text-selected' : ''}`}
            >
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === activeId && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onManageProjects} className="cursor-pointer">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Manage projects
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

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

      {/* Project switcher (hidden when collapsed) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <ProjectSwitcher onManageProjects={() => { setSettingsOpen(true); onMobileClose(); }} />
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
