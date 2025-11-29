'use client';

import { useMemo, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCookie } from '@/utils/cookie';

import { paths } from '@/paths';

import { useUserContext } from '../../contexts/user.context';
import { Button } from '../ui/button';
import { Settings } from './Settings';
import ModeToggle from './ToggleTheme';

const Navbar: FC = () => {
  const router = useRouter();
  const { user, refetchUser } = useUserContext();

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

  const logout = async (): Promise<void> => {
    // remove token from cookies
    await deleteCookie('token');
    // redirect to login page
    router.replace(paths.auth);
  };

  return (
    <div className="border-b w-full p-4 flex justify-between items-center flex-wrap space-y-2">
      {/* greetings user */}
      <div className="flex flex-col sm:flex-row gap-x-3 gap-y-1">
        <h3>{greetings},</h3>
        {/* user name */}
        {user?.name}
      </div>

      {/* settings logout */}
      <div className="flex items-center gap-2">
        {/* theme toggle */}
        <ModeToggle />
        {/* settings */}
        <Settings
          currentCompany={user?.currentCompany ?? ''}
          currentProject={user?.currentProject ?? ''}
          refetch={refetchUser}
        />
        {/* logout */}
        <Button variant="ghost" onClick={logout}>
          logout
        </Button>
      </div>
    </div>
  );
};

export default Navbar;
