import Login from "@/components/auth/login";
import Register from "@/components/auth/register";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FC } from "react";

type Props = {};

const Auth: FC<Props> = async ({}) => {
  return (
    <div className="container flex items-center justify-center">
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
