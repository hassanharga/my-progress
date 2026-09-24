'use client';

import { useMemo, useRef, useState } from 'react';
import { Laptop, LogOut, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useUserContext } from '@/contexts/user.context';
import { restoreOverlayFocus } from '@/components/shared/overlay-focus';
import { Settings } from '@/components/shared/Settings';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import ProjectSwitcher from './ProjectSwitcher';
import { THEME_OPTIONS } from './top-bar-model';

export default function DashboardTopBar() {
  const { setTheme, theme } = useTheme();
  const { user, logout, refetchUser } = useUserContext();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accountMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const settingsOpenerRef = useRef<HTMLElement | null>(null);

  const openSettings = (opener: HTMLElement | null) => {
    settingsOpenerRef.current = opener;
    setSettingsOpen(true);
  };

  const handleSettingsOpenChange = (open: boolean) => {
    setSettingsOpen(open);
    if (!open) restoreOverlayFocus(settingsOpenerRef.current);
  };

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [user]);

  return (
    <header className="sticky top-0 z-20 flex h-[var(--shell-topbar-height)] shrink-0 items-center gap-200 border-b bg-surface/90 px-200 backdrop-blur sm:px-300">
      <ProjectSwitcher onManageProjects={openSettings} />

      <div className="ml-auto flex items-center gap-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="subtle" size="icon" aria-label="Choose theme" className="relative cursor-pointer">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" aria-label="Theme">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
              {THEME_OPTIONS.map((option) => {
                const Icon = option.value === 'light' ? Sun : option.value === 'dark' ? Moon : Laptop;
                return (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="cursor-pointer">
                    <Icon className="mr-2 h-4 w-4" /> {option.label}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              ref={accountMenuTriggerRef}
              aria-label="Open account menu"
              className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focused focus-visible:ring-offset-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-brand-subtlest text-xs font-weight-medium text-text-brand">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="font-weight-normal">
              <p className="text-body font-weight-medium text-text">{user?.name}</p>
              <p className="text-body-small text-text-subtle truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openSettings(accountMenuTriggerRef.current)} className="cursor-pointer">
              <SettingsIcon className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} variant="destructive" className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {settingsOpen && (
        <Settings
          weekStartDay={user?.weekStartDay ?? 'MONDAY'}
          refetch={refetchUser}
          open={settingsOpen}
          setOpen={handleSettingsOpenChange}
        />
      )}
    </header>
  );
}
