'use client';

import { createContext, useContext, useEffect, useState, type JSX, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { deleteCookie } from '@/utils/cookie';
import { useAction } from 'next-safe-action/hooks';

import type { AccountProfile } from '@/types/user';
import { paths } from '@/paths';
import { me } from '@/actions/user';
import { isPrivateAccountPath } from '@/components/auth/auth-model';

interface UserContextType {
  user: AccountProfile | null;
  userLoading: boolean;
  userLoadFailed: boolean;
  refetchUser: () => void;
  setUserData: (userData: AccountProfile | null) => void;
  logout: () => Promise<void>;
}
const UserContext = createContext<UserContextType>({
  user: null,
  userLoading: true,
  userLoadFailed: false,
  refetchUser: () => {},
  logout: async () => {},
  setUserData: () => {},
});

const UserProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AccountProfile | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userLoadFailed, setUserLoadFailed] = useState(false);

  const { execute } = useAction(me, {
    onSuccess: ({ data }) => {
      setUser(data?.user ?? null);
      setUserLoadFailed(false);
      setUserLoading(false);
    },
    onError: () => {
      setUserLoadFailed(true);
      setUserLoading(false);
    },
  });

  useEffect(() => {
    if (!userLoading && !userLoadFailed && !user && isPrivateAccountPath(pathname)) {
      router.replace('/auth?mode=login&reason=session-ended');
    }
  }, [userLoading, userLoadFailed, user, pathname, router]);

  const setUserData = (userData: AccountProfile | null) => {
    setUser(userData);
    if (userData) {
      setUserLoadFailed(false);
      setUserLoading(false);
    }
  };

  const refetchUser = () => {
    setUserLoading(true);
    setUserLoadFailed(false);
    execute();
  };

  useEffect(() => {
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async (): Promise<void> => {
    await deleteCookie('token');
    setUserLoading(true);
    setUser(null);
    router.replace(paths.auth);
  };

  return (
    <UserContext.Provider value={{ user, userLoading, userLoadFailed, refetchUser, logout, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }

  return context;
};

export default UserProvider;
