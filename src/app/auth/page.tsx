import type { FC } from 'react';

import Login from '@/components/auth/login';
import Register from '@/components/auth/register';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Auth: FC = async () => {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <Login value="login" />
        <Register value="register" />
      </Tabs>
    </div>
  );
};

export default Auth;
