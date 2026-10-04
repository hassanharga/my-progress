'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createFirstProjectSchema } from '@/schema/project';
import type { TodayViewModel } from '@/server/today/today-types';
import { useAction } from 'next-safe-action/hooks';

import { createFirstProject } from '@/actions/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FirstProjectForm({
  onSaved,
  onCanonical,
  newProject = false,
  disabled = false,
  onPendingChange,
}: {
  onSaved: (data: { projectId: string; today: TodayViewModel }) => void | Promise<void>;
  onCanonical?: (today: TodayViewModel) => void;
  newProject?: boolean;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [rejections, setRejections] = useState(0);
  const identity = useRef<string | null>(null);
  const submitted = useRef<{ projectId: string; name: string } | null>(null);
  const submitting = useRef(false);
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rejections) summary.current?.focus();
  }, [rejections]);
  const reject = (message: string, retryable: boolean) => {
    setError(message);
    setUncertain(retryable);
    setRejections((count) => count + 1);
  };
  const { execute, isPending } = useAction(createFirstProject, {
    onSuccess: async ({ data }) => {
      if (data.ok) {
        try {
          await onSaved(data.data);
        } catch {
          reject('Your project may be saved, but the account could not be confirmed. Retry the same project.', true);
        }
        return;
      }
      if (data.canonical) onCanonical?.(data.canonical.today);
      reject(data.error.message, data.error.retryable);
    },
    onError: ({ error: actionError }) =>
      reject(
        actionError.validationErrors
          ? 'Enter a project name between 1 and 80 characters.'
          : 'Could not confirm your project. Retry the same details.',
        !actionError.validationErrors
      ),
    onSettled: () => {
      submitting.current = false;
      onPendingChange?.(false);
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || isPending || disabled) return;
    identity.current ??= crypto.randomUUID();
    const parsed = createFirstProjectSchema.safeParse(
      uncertain && submitted.current ? submitted.current : { projectId: identity.current, name }
    );
    if (!parsed.success) {
      reject('Enter a project name between 1 and 80 characters.', false);
      return;
    }
    submitted.current = parsed.data;
    submitting.current = true;
    onPendingChange?.(true);
    setError(null);
    execute(parsed.data);
  };
  return (
    <form aria-busy={isPending} className="space-y-200" noValidate onSubmit={submit}>
      {error ? (
        <div
          className="rounded-md border border-danger-border p-150 text-danger-text"
          ref={summary}
          id="first-project-error"
          role="alert"
          tabIndex={-1}
        >
          <p>{error}</p>
          <a className="underline" href="#first-project-name">
            Review project name
          </a>
          <p>
            <Link className="underline" href="/projects">
              Open Projects to check saved work
            </Link>
          </p>
        </div>
      ) : null}
      <div className="space-y-075">
        <Label htmlFor="first-project-name">Project name</Label>
        <Input
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'first-project-error' : undefined}
          autoComplete="off"
          disabled={disabled || isPending || uncertain}
          id="first-project-name"
          maxLength={80}
          onChange={(event) => setName(event.currentTarget.value)}
          required
          value={name}
        />
      </div>
      {uncertain ? (
        <p className="text-body-small text-text-subtle">
          Your project may already be saved. Retry checks the same project; it does not create another one.
        </p>
      ) : null}
      <Button className="min-h-11" disabled={disabled || isPending} type="submit">
        {isPending
          ? 'Checking project…'
          : uncertain
            ? 'Retry project'
            : newProject
              ? 'Create a new project'
              : 'Create project'}
      </Button>
    </form>
  );
}
