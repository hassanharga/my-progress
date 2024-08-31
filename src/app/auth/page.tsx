import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FC } from "react";

type Props = {};

const Auth: FC<Props> = async ({}) => {
  return (
    <Tabs defaultValue="login" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      <TabsContent value="login">Make changes to your login here.</TabsContent>
      <TabsContent value="register">Change your register here.</TabsContent>
    </Tabs>
  );
};

export default Auth;
