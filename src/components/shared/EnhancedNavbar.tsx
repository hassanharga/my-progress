'use client';

import { useMemo, useState, type FC } from 'react';
import { Laptop, LogOut, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
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

import { Settings } from './Settings';

const EnhancedNavbar: FC = () => {
  const { user, refetchUser, logout } = useUserContext();
  const { setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const greetings = useMemo(() => {
    const date = new Date();
    const hours = date.getHours();
    if (hours < 12) {
      return '👋 Good morning';
    } else if (hours < 18) {
      return '👋 Good afternoon';
    }
    return '👋 Good evening';
  }, []);

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
    <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left section - Greetings */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">{greetings}</h3>
            {user?.name && <p className="text-sm text-muted-foreground">{user.name}</p>}
          </div>
        </div>

        {/* TODO: Center section - Search (future command palette trigger) */}
        {/* {user?.id && (
          <div className="hidden md:flex flex-1 max-w-sm mx-8">
            <Button
              variant="outline"
              className="w-full justify-start text-sm text-muted-foreground"
              onClick={() => {
                // Open command palette
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Search or press ⌘K</span>
            </Button>
          </div>
        )} */}

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Laptop className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          {user?.id && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10">{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & Support
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {/* Settings Dialog */}
          {settingsOpen && (
            <Settings
              currentCompany={user?.currentCompany ?? ''}
              currentProject={user?.currentProject ?? ''}
              refetch={refetchUser}
              open={settingsOpen}
              setOpen={setSettingsOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedNavbar;
