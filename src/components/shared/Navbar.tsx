'use client';

import { useEffect, useMemo, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCookie } from '@/utils/cookie';
import { useAction } from 'next-safe-action/hooks';

import { paths } from '@/paths';
import { me } from '@/actions/user';

import { Button } from '../ui/button';
import { Settings } from './Settings';

const Navbar: FC = () => {
  const router = useRouter();
  const { result, execute } = useAction(me);

  //   console.log('result[me] ====>', result);

  useEffect(() => {
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="border-b-[1px] border-foreground w-full py-4  flex justify-between items-center">
      {/* greetings user */}
      <div className="flex flex-col sm:flex-row gap-x-3 gap-y-1">
        <h3>{greetings}</h3>
        {/* user name */}
        {result?.data?.user?.name}
      </div>
      {/* settings logout */}
      <div className="flex items-center gap-2">
        {/* settings */}
        <Settings
          currentCompany={result?.data?.user?.currentCompany ?? ''}
          currentProject={result?.data?.user?.currentProject ?? ''}
          refetch={execute}
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
