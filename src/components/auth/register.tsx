'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { registerSchema } from '@/schema/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { paths } from '@/paths';
import { createUser } from '@/actions/user';
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

const Register: FC<Props> = ({ value }) => {
  const { setUserData } = useUserContext();
  const router = useRouter();

  const { form, action, handleSubmitWithAction } = useHookFormAction(createUser, zodResolver(registerSchema), {
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

  // console.log("action.result[register] ====>", action.result);

  return (
    <TabsContent value={value}>
      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>Register a new account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!action.isExecuting ? <DisplayServerActionResponse result={action.result} /> : null}
          <form className="space-y-4" onSubmit={handleSubmitWithAction}>
            {form.formState.errors.root ? (
              <p className="text-rose-700 text-sm">{form.formState.errors.root.message}</p>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name ? (
                <p className="text-rose-700 text-sm">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
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
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input type="password" id="confirmPassword" {...form.register('confirmPassword')} />
              {form.formState.errors.confirmPassword ? (
                <p className="text-rose-700 text-sm">{form.formState.errors.confirmPassword.message}</p>
              ) : null}
            </div>
            <Button className="mt-2" type="submit" disabled={action.isExecuting}>
              Register
            </Button>
          </form>
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default Register;
