'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { firstUseTimezoneSchema } from '@/schema/user';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type TimezoneSaveOutcome = { ok: boolean; message?: string };
const subscribeTimezone = () => () => undefined;
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimezone = () => null;
export default function TimezoneGuide({
  timezone,
  onSave,
  disabled = false,
}: {
  timezone: string;
  onSave: (timezone: string) => Promise<TimezoneSaveOutcome>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(timezone);
  const suggestion = useSyncExternalStore(subscribeTimezone, browserTimezone, serverTimezone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [rejections, setRejections] = useState(0);
  const submitting = useRef(false);
  const saveButton = useRef<HTMLButtonElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rejections) summary.current?.focus();
  }, [rejections]);
  useEffect(() => {
    if (saved && !pending) saveButton.current?.focus();
  }, [saved, pending]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || disabled) return;
    setSaved(false);
    const input = firstUseTimezoneSchema.safeParse({ timezone: draft });
    if (!input.success) {
      setError('Choose a valid IANA timezone.');
      setRejections((count) => count + 1);
      return;
    }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const outcome = await onSave(input.data.timezone);
      if (outcome.ok) setSaved(true);
      else {
        setError(outcome.message ?? 'Could not confirm the timezone. Retry the same timezone.');
        setRejections((count) => count + 1);
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  return (
    <section
      aria-labelledby="setup-timezone-heading"
      className="space-y-200 rounded-lg border border-border bg-surface p-250"
    >
      <h2 className="font-heading text-heading-small text-text" id="setup-timezone-heading">
        Your daily plan
      </h2>
      <p className="break-words text-body text-text">Saved timezone: {timezone}</p>
      <p className="text-body text-text-subtle">
        Today gathers work from your projects. Creating a task here saves it in its project and adds it to Today.
      </p>
      <form aria-busy={pending} className="space-y-150" noValidate onSubmit={(event) => void submit(event)}>
        <Label htmlFor="setup-timezone">Timezone</Label>
        <Input
          aria-describedby={error ? 'setup-timezone-help setup-timezone-error' : 'setup-timezone-help'}
          aria-invalid={Boolean(error)}
          disabled={pending || disabled}
          id="setup-timezone"
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setSaved(false);
          }}
          value={draft}
        />
        <p className="text-body-small text-text-subtle" id="setup-timezone-help">
          Use an IANA name, such as Africa/Cairo. Saving changes how days are grouped, not past task timestamps.
        </p>
        {suggestion && suggestion !== timezone ? (
          <p className="break-words text-body-small text-text-subtle">
            Browser suggestion: {suggestion}.{' '}
            <Button disabled={pending || disabled} onClick={() => setDraft(suggestion)} type="button" variant="subtle">
              Use suggestion
            </Button>{' '}
            (save to apply)
          </p>
        ) : null}
        {disabled ? (
          <p className="text-body-small text-text-subtle">
            Finish or retry the task submission before changing timezone.
          </p>
        ) : null}
        {error ? (
          <div className="text-danger-text" id="setup-timezone-error" ref={summary} role="alert" tabIndex={-1}>
            <p>{error}</p>
            <a className="underline" href="#setup-timezone">
              Review timezone
            </a>
          </div>
        ) : null}
        <Button className="min-h-11" disabled={pending || disabled} ref={saveButton} type="submit">
          {pending ? 'Checking timezone…' : error ? 'Retry timezone' : 'Save timezone'}
        </Button>
        <p aria-live="polite" role="status">
          {saved ? 'Timezone and daily plan updated.' : ''}
        </p>
      </form>
      <Link className="text-body-small underline" href="/settings">
        Set optional daily capacity in Settings
      </Link>
    </section>
  );
}
