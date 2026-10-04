'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Laptop, LogOut, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { paths } from '@/paths';
import { useUserContext } from '@/contexts/user.context';
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
  const { user, logout } = useUserContext();

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
      <ProjectSwitcher />

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
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={paths.settings}>
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} variant="destructive" className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
