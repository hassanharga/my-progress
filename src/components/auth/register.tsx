'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { registerSchema } from '@/schema/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';

import { paths } from '@/paths';
import { createUser } from '@/actions/user';
import { useUserContext } from '@/contexts/user.context';
import DisplayServerActionResponse from '@/components/shared/DisplayServerActionResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = {
  onSwitchToLogin: () => void;
};

const Register: FC<Props> = ({ onSwitchToLogin }) => {
  const { setUserData } = useUserContext();
  const router = useRouter();

  const { form, action, handleSubmitWithAction } = useHookFormAction(createUser, zodResolver(registerSchema), {
    errorMapProps: {},
    formProps: { mode: 'onChange' },
    actionProps: {
      onSuccess: ({ data }) => {
        setUserData(data);
        router.replace(paths.dashboard);
      },
    },
  });

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start tracking your progress today</p>
      </div>

      {!action?.isExecuting ? <DisplayServerActionResponse result={action.result} /> : null}

      <form className="space-y-4" onSubmit={handleSubmitWithAction}>
        {form.formState.errors.root ? (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Your name" {...form.register('name')} />
          {form.formState.errors.name ? (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input type="password" id="password" placeholder="••••••••" {...form.register('password')} />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input type="password" id="confirmPassword" placeholder="••••••••" {...form.register('confirmPassword')} />
          {form.formState.errors.confirmPassword ? (
            <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
          ) : null}
        </div>
        <Button className="w-full" type="submit" disabled={action.isExecuting}>
          {action.isExecuting ? <Spinner /> : null}
          Create account
          {!action.isExecuting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </button>
      </p>
    </div>
  );
};

export default Register;
