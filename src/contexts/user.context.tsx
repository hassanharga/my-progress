'use client';

import { createContext, useContext, useEffect, useState, type JSX, type ReactNode } from 'react';
import { useAction } from 'next-safe-action/hooks';

import { me } from '@/actions/user';

import type { User } from '../../generated/prisma/client';

interface UserContextType {
  user: User | null;
  refetchUser: () => void;
}
const UserContext = createContext<UserContextType>({
  user: null,
  refetchUser: () => {
    // refetchUser
  },
});

const UserProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [user, setUser] = useState<User | null>(null);

  const { execute } = useAction(me, {
    onSuccess: ({ data }) => {
      // console.log('user data ====>', data?.user);
      if (data?.user) setUser({ ...data?.user });
    },
  });

  useEffect(() => {
    execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <UserContext.Provider value={{ user, refetchUser: execute }}>{children}</UserContext.Provider>;
};

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }

  return context;
};

export default UserProvider;
