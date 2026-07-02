'use client';

import { useMemo } from 'react';
import { Laptop, LogOut, Menu, Moon, Plus, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useUserContext } from '@/contexts/user.context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DashboardTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { setTheme } = useTheme();
  const { user, logout } = useUserContext();

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }, [user]);

  const handleCreateTask = () => {
    window.dispatchEvent(new CustomEvent('create-task'));
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-surface/80 px-4 backdrop-blur">
      <Button variant="subtle" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <h1 className="text-heading-xsmall font-weight-bold text-text">Tasks</h1>

      <div className="ml-auto flex items-center gap-100">
        <Button variant="primary" size="sm" className="cursor-pointer" onClick={handleCreateTask}>
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create task</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="subtle" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Laptop className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focused">
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
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-text-danger">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
