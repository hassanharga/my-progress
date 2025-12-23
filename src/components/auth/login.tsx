'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { loginSchema } from '@/schema/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { paths } from '@/paths';
import { loginUser } from '@/actions/user';
import { useUserContext } from '@/contexts/user.context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';

import DisplayServerActionResponse from '../shared/DisplayServerActionResponse';

type Props = {
  value: string;
};

const Login: FC<Props> = ({ value }) => {
  const { setUserData } = useUserContext();
  const router = useRouter();

  const { form, action, handleSubmitWithAction } = useHookFormAction(loginUser, zodResolver(loginSchema), {
    errorMapProps: {},
    formProps: {
      mode: 'onChange',
    },
    actionProps: {
      onSuccess: ({ data }) => {
        setUserData(data);
        router.replace(paths.home);
      },
    },
  });

  // console.log('action.result[login] ====>', action.result);

  return (
    <TabsContent value={value}>
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Login to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!action?.isExecuting ? <DisplayServerActionResponse result={action.result} /> : null}
          <form className="space-y-4" onSubmit={handleSubmitWithAction}>
            {form.formState.errors.root ? (
              <p className="text-rose-700 text-sm">{form.formState.errors.root.message}</p>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="text-rose-700 text-sm">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input type="password" id="password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <p className="text-rose-700 text-sm">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <Button className="mt-2" type="submit">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default Login;
