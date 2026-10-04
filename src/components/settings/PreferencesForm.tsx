'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { settingsSchema } from '@/schema/user';
import { useAction } from 'next-safe-action/hooks';
import { ZodError } from 'zod';

import type { AccountProfile } from '@/types/user';
import { updateSettings } from '@/actions/user';
import { useUserContext } from '@/contexts/user.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PreferenceDraft = { timezone: string; weekStartDay: string; capacity: string };
const draftFor = (profile: AccountProfile): PreferenceDraft => ({
  timezone: profile.timezone,
  weekStartDay: profile.weekStartDay,
  capacity: profile.dailyCapacityMinutes === null ? '' : String(profile.dailyCapacityMinutes),
});
export const parsePreferenceDraft = (draft: PreferenceDraft) =>
  settingsSchema.parse({
    timezone: draft.timezone,
    weekStartDay: draft.weekStartDay,
    dailyCapacityMinutes: draft.capacity.trim() === '' ? null : Number(draft.capacity),
  });

export default function PreferencesForm({
  profile,
  onSaved,
}: {
  profile: AccountProfile;
  onSaved?: (profile: AccountProfile) => void;
}) {
  const router = useRouter();
  const { setUserData, refetchUser } = useUserContext();
  const [draft, setDraft] = useState(() => draftFor(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rejected, setRejected] = useState(0);
  const [saved, setSaved] = useState(0);
  const summary = useRef<HTMLDivElement>(null);
  const saveControl = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const { execute, isPending } = useAction(updateSettings, {
    onSuccess: ({ data }) => {
      setDraft(draftFor(data));
      setErrors({});
      setSaved((count) => count + 1);
      setUserData(data);
      onSaved?.(data);
      refetchUser();
      router.refresh();
    },
    onError: ({ error }) => {
      const next: Record<string, string> = {};
      for (const key of ['timezone', 'weekStartDay', 'dailyCapacityMinutes'] as const) {
        const message = error.validationErrors?.[key]?._errors?.[0];
        if (message) next[key] = message;
      }
      if (Object.keys(next).length === 0)
        next.form = error.serverError ?? 'Unable to save preferences. Please try again.';
      setErrors(next);
      setRejected((count) => count + 1);
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  useEffect(() => {
    if (rejected > 0) summary.current?.focus();
  }, [rejected]);
  useEffect(() => {
    if (saved > 0 && !isPending) saveControl.current?.focus();
  }, [saved, isPending]);
  const updateDraft = (key: keyof PreferenceDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(0);
  };
  return (
    <form
      noValidate
      aria-busy={isPending}
      className="flex min-w-0 flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current || isPending) return;
        setSaved(0);
        setErrors({});
        try {
          const input = parsePreferenceDraft(draft);
          submitting.current = true;
          execute(input);
        } catch (error) {
          const next: Record<string, string> = {};
          if (error instanceof ZodError)
            for (const issue of error.issues) next[String(issue.path[0] ?? 'form')] = issue.message;
          else next.form = 'Check your preferences and try again.';
          setErrors(next);
          setRejected((count) => count + 1);
        }
      }}
    >
      {Object.keys(errors).length > 0 ? (
        <div ref={summary} role="alert" tabIndex={-1} className="flex flex-col gap-2 text-body text-text-danger">
          <p>Preferences were not saved. Check the details below and try again.</p>
          {Object.entries(errors).map(([key, message]) =>
            key === 'form' ? (
              <p key={key}>{message}</p>
            ) : (
              <a key={key} href={`#${key}`}>
                {message}
              </a>
            )
          )}
        </div>
      ) : null}
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-5">
        <legend className="mb-4 text-heading-small font-weight-semibold">Planning preferences</legend>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            value={draft.timezone}
            onChange={(event) => updateDraft('timezone', event.target.value)}
            aria-invalid={!!errors.timezone}
            aria-describedby={errors.timezone ? 'timezone-help timezone-error' : 'timezone-help'}
          />
          <p id="timezone-help" className="text-body-small text-text-subtle">
            Use an IANA timezone, such as Africa/Cairo or Pacific/Honolulu.
          </p>
          {errors.timezone ? (
            <p id="timezone-error" className="text-body-small text-text-danger">
              {errors.timezone}
            </p>
          ) : null}
          <p className="text-body-small text-text-subtle">
            Changing your timezone changes how Today, Insights and Reports group your work. Saved plan dates and session
            durations stay unchanged.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="weekStartDay">Week starts on</Label>
          <select
            id="weekStartDay"
            name="weekStartDay"
            value={draft.weekStartDay}
            onChange={(event) => updateDraft('weekStartDay', event.target.value)}
            className="min-w-0 rounded-md border border-border-input bg-surface p-2 text-body focus-visible:outline-2 focus-visible:outline-border-focused"
            aria-invalid={!!errors.weekStartDay}
            aria-describedby={errors.weekStartDay ? 'weekStartDay-error' : undefined}
          >
            <option value="SUNDAY">Sunday</option>
            <option value="MONDAY">Monday</option>
            <option value="SATURDAY">Saturday</option>
          </select>
          {errors.weekStartDay ? (
            <p id="weekStartDay-error" className="text-body-small text-text-danger">
              {errors.weekStartDay}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dailyCapacityMinutes">Daily capacity (minutes)</Label>
          <Input
            id="dailyCapacityMinutes"
            name="dailyCapacityMinutes"
            type="number"
            min={0}
            max={1440}
            step={1}
            value={draft.capacity}
            onChange={(event) => updateDraft('capacity', event.target.value)}
            aria-invalid={!!errors.dailyCapacityMinutes}
            aria-describedby={
              errors.dailyCapacityMinutes ? 'capacity-help dailyCapacityMinutes-error' : 'capacity-help'
            }
          />
          <p id="capacity-help" className="text-body-small text-text-subtle">
            Leave blank for no capacity target. Zero means zero available minutes.
          </p>
          {errors.dailyCapacityMinutes ? (
            <p id="dailyCapacityMinutes-error" className="text-body-small text-text-danger">
              {errors.dailyCapacityMinutes}
            </p>
          ) : null}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button ref={saveControl} type="submit" disabled={isPending}>
          {isPending ? 'Saving preferences…' : 'Save preferences'}
        </Button>
        <p role="status" aria-live="polite" className="text-body-small text-text-subtle">
          {saved > 0 ? 'Preferences saved.' : ''}
        </p>
      </div>
    </form>
  );
}
