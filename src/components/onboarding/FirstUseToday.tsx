'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import type { TodayViewModel } from '@/server/today/today-types';
import { useAction } from 'next-safe-action/hooks';

import type { AccountProfile } from '@/types/user';
import { me, saveFirstUseTimezone } from '@/actions/user';
import { useUserContext } from '@/contexts/user.context';
import { TodayCockpit } from '@/components/today/TodayCockpit';

import FirstProjectForm from './FirstProjectForm';
import TimezoneGuide, { type TimezoneSaveOutcome } from './TimezoneGuide';

export default function FirstUseToday({
  initialToday,
  profile,
  firstUse,
}: {
  initialToday: TodayViewModel;
  profile: AccountProfile;
  firstUse: { activeProjectCount: number; archivedProjectCount: number; taskCount: number };
}) {
  const [pair, setPair] = useState({ today: initialToday, profile });
  const today = pair.today;
  const hasCockpit = Boolean(
    today.projects.length || today.items.length || today.runningIndicators.length || today.carryover.length
  );
  const [created, setCreated] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [zoneBlocked, setZoneBlocked] = useState(false);
  const [projectPending, setProjectPending] = useState(false);
  const projectPendingRef = useRef(false);
  const cockpitActivity = useRef(false);
  const [cockpitBusy, setCockpitBusy] = useState(false);
  const updateActivity = useCallback((active: boolean) => {
    cockpitActivity.current = active;
    setCockpitBusy(active);
  }, []);
  const zonePending = useRef(false);
  const pendingAcknowledgment = useRef<((outcome: TimezoneSaveOutcome) => void) | null>(null);
  const { setUserData } = useUserContext();
  const { executeAsync } = useAction(saveFirstUseTimezone);
  const { executeAsync: readAccount } = useAction(me);
  const needsProject = firstUse.activeProjectCount === 0 && !created;
  const Heading = hasCockpit ? 'h2' : 'h1';
  const saveTimezone = async (timezone: string): Promise<TimezoneSaveOutcome> => {
    if (zonePending.current || projectPendingRef.current || cockpitActivity.current)
      return { ok: false, message: 'Wait for the project request to finish before changing timezone.' };
    zonePending.current = true;
    setZoneBlocked(true);
    try {
      const result = (await executeAsync({ timezone }))?.data;
      if (result?.ok) {
        if (hasCockpit)
          return await new Promise<TimezoneSaveOutcome>((resolve) => {
            pendingAcknowledgment.current = resolve;
            setPair(result.data);
          });
        setPair(result.data);
        setUserData(result.data.profile);
        setZoneBlocked(false);
        return { ok: true };
      }
      return {
        ok: false,
        message:
          result && !result.ok ? result.error.message : 'Could not confirm the timezone. Retry the same timezone.',
      };
    } catch {
      return { ok: false, message: 'Could not confirm the timezone. Retry the same timezone.' };
    } finally {
      zonePending.current = false;
    }
  };
  return (
    <>
      {needsProject ? (
        <section
          aria-labelledby="first-use-heading"
          className="mx-auto w-full max-w-7xl space-y-200 p-200 sm:p-300 lg:p-400"
        >
          <Heading className="font-heading text-heading-large text-text" id="first-use-heading">
            Set up your daily plan
          </Heading>
          <p className="text-body text-text-subtle">
            Today gathers work from your projects into one daily plan. Creating a task here saves it in its project and
            adds it to Today.
          </p>
          <TimezoneGuide
            disabled={projectPending || cockpitBusy}
            onSave={saveTimezone}
            timezone={pair.profile.timezone}
          />
          {needsProject ? (
            <div className="space-y-200 rounded-lg border border-border bg-surface p-250">
              <h2 className="font-heading text-heading-small text-text">
                {firstUse.archivedProjectCount ? 'Continue your work' : 'Create your first project'}
              </h2>
              {firstUse.archivedProjectCount ? (
                <p className="text-body text-text-subtle">
                  You have archived projects.{' '}
                  <Link className="underline" href="/projects">
                    Open Projects to restore or manage them
                  </Link>
                  , or create a new project below.
                </p>
              ) : null}
              <FirstProjectForm
                disabled={zoneBlocked}
                newProject={firstUse.archivedProjectCount > 0}
                onPendingChange={(pending) => {
                  projectPendingRef.current = pending;
                  setProjectPending(pending);
                }}
                onCanonical={(canonical) => setPair((previous) => ({ ...previous, today: canonical }))}
                onSaved={async ({ projectId, today: savedToday }) => {
                  const account = (await readAccount())?.data?.user;
                  if (
                    !account ||
                    account.id !== profile.id ||
                    account.timezone !== savedToday.timezone ||
                    account.dailyCapacityMinutes !== savedToday.workload.capacityMinutes
                  )
                    throw new Error('Could not confirm the current account and project. Retry the same project.');
                  setPair({ profile: account, today: savedToday });
                  setUserData(account);
                  setCreated(true);
                  setCreatedProjectId(projectId);
                }}
              />
            </div>
          ) : null}
        </section>
      ) : null}
      {created ? (
        <p aria-live="polite" className="mx-auto max-w-7xl px-200 text-body-small text-text-subtle" role="status">
          Project saved: {today.projects.find((project) => project.id === createdProjectId)?.name}. Create your first
          task to add it to Today.
        </p>
      ) : null}
      {hasCockpit ? (
        <TodayCockpit
          canonicalSetup={pair}
          onActivityChange={updateActivity}
          onSetupApplied={() => {
            setZoneBlocked(false);
            pendingAcknowledgment.current?.({ ok: true });
            pendingAcknowledgment.current = null;
          }}
          onSetupRejected={() => {
            pendingAcknowledgment.current?.({ ok: false, message: 'The daily plan changed. Retry the same timezone.' });
            pendingAcknowledgment.current = null;
          }}
          externalPreferencesBlocked={needsProject && zoneBlocked}
          initialToday={today}
          focusTaskCreation={created}
          setupProfile={!needsProject && firstUse.taskCount === 0 ? pair.profile : undefined}
          onProfileApplied={setUserData}
        />
      ) : null}
    </>
  );
}
