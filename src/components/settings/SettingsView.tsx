'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';

import type { AccountProfile } from '@/types/user';
import { paths } from '@/paths';
import { useUserContext } from '@/contexts/user.context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import PreferencesForm from './PreferencesForm';

export default function SettingsView({ profile }: { profile: AccountProfile }) {
  const { theme, setTheme } = useTheme();
  const { logout } = useUserContext();
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-8 p-4 sm:p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-heading-large font-weight-bold">Settings</h1>
        <p className="text-body text-text-subtle">Set how your work is planned and reviewed.</p>
      </header>
      <PreferencesForm profile={profile} />
      <section aria-labelledby="appearance-heading" className="flex min-w-0 flex-col gap-3">
        <h2 id="appearance-heading" className="text-heading-small font-weight-semibold">
          Appearance
        </h2>
        <p className="text-body-small text-text-subtle">This browser. Theme changes apply immediately.</p>
        <Label htmlFor="browser-theme">Theme</Label>
        <select
          id="browser-theme"
          value={theme ?? 'system'}
          onChange={(event) => setTheme(event.target.value)}
          className="min-w-0 rounded-md border border-border-input bg-surface p-2 text-body focus-visible:outline-2 focus-visible:outline-border-focused"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </section>
      <section aria-labelledby="projects-heading" className="flex flex-col gap-3">
        <h2 id="projects-heading" className="text-heading-small font-weight-semibold">
          Projects
        </h2>
        <Link href={paths.projects} className="text-link underline underline-offset-4">
          Manage projects
        </Link>
      </section>
      <section aria-labelledby="account-heading" className="flex min-w-0 flex-col gap-3">
        <h2 id="account-heading" className="text-heading-small font-weight-semibold">
          Account
        </h2>
        <dl className="flex min-w-0 flex-col gap-2 text-body">
          <div>
            <dt className="text-text-subtle">Name</dt>
            <dd className="break-words">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-text-subtle">Email</dt>
            <dd className="break-all">{profile.email}</dd>
          </div>
        </dl>
        <Button type="button" variant="subtle" className="self-start" onClick={logout}>
          Log out
        </Button>
      </section>
    </div>
  );
}
