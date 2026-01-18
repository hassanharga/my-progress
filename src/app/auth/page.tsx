import type { FC } from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import Login from '@/components/auth/login';
import Register from '@/components/auth/register';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Sign in to your account or create a new one to start tracking your project progress.',
  openGraph: {
    title: 'Authentication | My Progress',
    description: 'Sign in to your account or create a new one to start tracking your project progress.',
    url: `${config.site.url}/auth`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

const Auth: FC = async () => {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Tabs defaultValue="login" className="w-100">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login" className="cursor-pointer">
            Login
          </TabsTrigger>
          <TabsTrigger value="register" className="cursor-pointer">
            Register
          </TabsTrigger>
        </TabsList>
        <Login value="login" />
        <Register value="register" />
      </Tabs>
    </div>
  );
};

export default Auth;
