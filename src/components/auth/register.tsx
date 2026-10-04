'use client';

import { useEffect, useRef, type FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerSchema } from '@/schema/user';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';
import { ArrowRight } from 'lucide-react';

import { paths } from '@/paths';
import { createUser } from '@/actions/user';
import { useUserContext } from '@/contexts/user.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { shouldFocusAuthSummary } from './auth-model';

const Register: FC = () => {
  const { setUserData } = useUserContext();
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const previousSettlement = useRef({ submitCount: 0, serverError: undefined as string | undefined });

  const { form, action, handleSubmitWithAction } = useHookFormAction(createUser, zodResolver(registerSchema), {
    errorMapProps: {},
    formProps: { mode: 'onChange', shouldFocusError: false },
    actionProps: {
      onSuccess: ({ data }) => {
        setUserData(data);
        router.replace(paths.dashboard);
      },
    },
  });
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const fieldErrors = form.formState.errors;
  const hasErrors = !!action.result.serverError || Object.keys(fieldErrors).length > 0;
  useEffect(() => {
    const current = {
      submitCount: form.formState.submitCount,
      serverError: action.result.serverError,
      pending: action.isPending,
      hasErrors,
    };
    if (shouldFocusAuthSummary(current, previousSettlement.current)) summary.current?.focus();
    if (!action.isPending) previousSettlement.current = current;
  }, [hasErrors, form.formState.submitCount, action.result.serverError, action.isPending]);

  return (
    <div className="flex w-full min-w-0 max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2 text-start">
        <h1 ref={heading} tabIndex={-1} className="text-heading-large font-weight-bold">
          Create your account
        </h1>
        <p className="text-body text-text-subtle">Start tracking your progress today</p>
      </div>

      {hasErrors ? (
        <div ref={summary} tabIndex={-1} role="alert" className="flex flex-col gap-2 text-body text-text-danger">
          <p>{action.result.serverError ?? 'Check the highlighted fields and try again.'}</p>
          {(['name', 'email', 'password', 'confirmPassword'] as const).map((key) =>
            fieldErrors[key] ? (
              <a key={key} href={`#${key}`}>
                {fieldErrors[key]?.message}
              </a>
            ) : null
          )}
        </div>
      ) : null}

      <form
        noValidate
        className="flex flex-col gap-4"
        aria-busy={action.isPending}
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current || action.isPending) return;
          submitting.current = true;
          try {
            await handleSubmitWithAction(event);
          } finally {
            submitting.current = false;
          }
        }}
      >
        {form.formState.errors.root ? (
          <p className="text-body text-text-danger">{form.formState.errors.root.message}</p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            placeholder="Your name"
            {...form.register('name')}
          />
          {form.formState.errors.name ? (
            <p id="name-error" className="text-body text-text-danger">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            placeholder="you@example.com"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p id="email-error" className="text-body text-text-danger">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            id="password"
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            placeholder="••••••••"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p id="password-error" className="text-body text-text-danger">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
            placeholder="••••••••"
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword ? (
            <p id="confirm-password-error" className="text-body text-text-danger">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
        <Button className="w-full" type="submit" disabled={action.isPending}>
          {action.isPending ? 'Creating account…' : 'Create account'}
          {!action.isPending ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
        </Button>
      </form>

      <p className="text-center text-body text-text-subtle">
        Already have an account?{' '}
        <Link href="/auth?mode=login" className="font-weight-medium text-text-brand underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
};

export default Register;
