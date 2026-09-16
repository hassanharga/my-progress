'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';

import { restoreOverlayFocus } from '@/components/shared/overlay-focus';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateTodayTaskInput } from '@/schema/today';
import type { TodayProjectIdentity } from '@/server/today/today-types';

import type { TodayActionOutcome } from './today-reducer';

export type InlineTaskDraft = {
  plannedMinutes: string;
  projectId: string;
  requestId: string | null;
  startNow: boolean;
  title: string;
};

export const createInlineTaskDraft = (): InlineTaskDraft => ({
  plannedMinutes: '',
  projectId: '',
  requestId: null,
  startNow: false,
  title: '',
});

export const requestIdForSubmit = (requestId: string | null, createId: () => string = () => crypto.randomUUID()): string =>
  requestId ?? createId();

export const settleInlineTaskDraft = (draft: InlineTaskDraft, outcome: TodayActionOutcome): InlineTaskDraft =>
  outcome.ok ? createInlineTaskDraft() : draft;

export type InlineTaskFormFieldsProps = {
  draft: InlineTaskDraft;
  onChange: (draft: InlineTaskDraft) => void;
  pending: boolean;
  projects: TodayProjectIdentity[];
};

export function InlineTaskFormFields({ draft, onChange, pending, projects }: InlineTaskFormFieldsProps): ReactNode {
  return (
    <fieldset className="space-y-200" disabled={pending}>
      <div className="space-y-075">
        <Label htmlFor="today-create-project">Project</Label>
        <select
          className="h-9 w-full rounded-md border border-border-input bg-surface px-3 text-body outline-none focus-visible:border-border-focused focus-visible:ring-[3px] focus-visible:ring-border-focused/50"
          id="today-create-project"
          onChange={(event) => onChange({ ...draft, projectId: event.currentTarget.value })}
          required
          value={draft.projectId}
        >
          <option disabled value="">Choose a project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>
      <div className="space-y-075">
        <Label htmlFor="today-create-title">Task title</Label>
        <Input
          autoComplete="off"
          id="today-create-title"
          maxLength={200}
          onChange={(event) => onChange({ ...draft, title: event.currentTarget.value })}
          required
          value={draft.title}
        />
      </div>
      <div className="space-y-075">
        <Label htmlFor="today-create-minutes">Planned minutes <span className="text-text-subtle">(optional)</span></Label>
        <Input
          id="today-create-minutes"
          inputMode="numeric"
          max={1440}
          min={1}
          onChange={(event) => onChange({ ...draft, plannedMinutes: event.currentTarget.value })}
          placeholder="For example, 45…"
          step={1}
          type="number"
          value={draft.plannedMinutes}
        />
      </div>
      <label className="flex min-h-11 items-center gap-100 text-body text-text" htmlFor="today-create-start-now">
        <input
          checked={draft.startNow}
          className="size-4 accent-brand-bold"
          id="today-create-start-now"
          onChange={(event) => onChange({ ...draft, startNow: event.currentTarget.checked })}
          type="checkbox"
        />
        Start this task now
      </label>
    </fieldset>
  );
}

export type InlineTaskFormProps = {
  onCreate: (input: CreateTodayTaskInput) => Promise<TodayActionOutcome>;
  planDate: string;
  projects: TodayProjectIdentity[];
};

export function InlineTaskForm({ onCreate, planDate, projects }: InlineTaskFormProps): ReactNode {
  const [draft, setDraft] = useState<InlineTaskDraft>(createInlineTaskDraft);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestId = requestIdForSubmit(draft.requestId);
    const submittedDraft = { ...draft, requestId };
    setDraft(submittedDraft);
    setPending(true);
    const outcome = await onCreate({
      planDate,
      plannedMinutes: submittedDraft.plannedMinutes === '' ? undefined : Number(submittedDraft.plannedMinutes),
      projectId: submittedDraft.projectId,
      requestId,
      startNow: submittedDraft.startNow,
      title: submittedDraft.title,
    });
    setPending(false);
    setDraft(settleInlineTaskDraft(submittedDraft, outcome));
    if (outcome.ok) setOpen(false);
  };

  return (
    <>
      <Button className="min-h-11" disabled={projects.length === 0} onClick={() => setOpen(true)} ref={openerRef} type="button">
        Create task
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreOverlayFocus(openerRef.current);
          }}
        >
          <DialogHeader>
            <DialogTitle>Create and plan a task</DialogTitle>
            <DialogDescription>Choose where the work belongs, then add it directly to Today.</DialogDescription>
          </DialogHeader>
          <form className="space-y-250" onSubmit={(event) => void handleSubmit(event)}>
            <InlineTaskFormFields draft={draft} onChange={setDraft} pending={pending} projects={projects} />
            <div className="flex flex-col-reverse gap-100 sm:flex-row sm:justify-end">
              <Button className="min-h-11" disabled={pending} onClick={() => setOpen(false)} type="button" variant="subtle">Cancel</Button>
              <Button className="min-h-11" disabled={pending} type="submit">{pending ? 'Creating…' : 'Create and add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
