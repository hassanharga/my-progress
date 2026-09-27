'use client';

import { createContext, useContext, useEffect, useState, type JSX, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCookie } from '@/utils/cookie';
import { useAction } from 'next-safe-action/hooks';

import { User } from '@/types/user';
import { paths } from '@/paths';
import { me } from '@/actions/user';

interface UserContextType {
  user: User | null;
  userLoading: boolean;
  userLoadFailed: boolean;
  refetchUser: () => void;
  setUserData: (userData: User | null) => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userLoadFailed, setUserLoadFailed] = useState(false);

  const { execute } = useAction(me, {
    onSuccess: ({ data }) => {
      setUser(data?.user ?? null);
      setUserLoadFailed(!data?.user);
      setUserLoading(false);
    },
    onError: () => {
      setUserLoadFailed(true);
      setUserLoading(false);
    },
  });

  const setUserData = (userData: User | null) => {
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
