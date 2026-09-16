'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';

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
import type { TodayBacklogItem } from '@/server/today/today-types';

import type { TodayActionOutcome } from './today-reducer';

export const filterTodayBacklog = (backlog: TodayBacklogItem[], query: string): TodayBacklogItem[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return backlog;
  return backlog.filter(({ project, title }) =>
    `${title}\n${project.name}`.toLowerCase().includes(normalizedQuery)
  );
};

export const settleBacklogQuery = (query: string, outcome: TodayActionOutcome): string =>
  outcome.ok ? '' : query;

export type BacklogPickerPanelProps = {
  backlog: TodayBacklogItem[];
  onAdd: (item: TodayBacklogItem) => void;
  pendingTaskId: string | null;
  query: string;
  setQuery: (query: string) => void;
};

export function BacklogPickerPanel({ backlog, onAdd, pendingTaskId, query, setQuery }: BacklogPickerPanelProps): ReactNode {
  const results = useMemo(() => filterTodayBacklog(backlog, query), [backlog, query]);

  return (
    <div className="space-y-200">
      <div className="space-y-075">
        <Label htmlFor="today-backlog-search">Search backlog</Label>
        <Input
          autoComplete="off"
          id="today-backlog-search"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search tasks or projects…"
          type="search"
          value={query}
        />
      </div>
      {results.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-200 text-body-small text-text-subtle">
          {backlog.length === 0 && query.trim() === ''
            ? 'No backlog tasks are available. Tasks already planned today are not listed.'
            : `No backlog tasks match “${query.trim()}”. Try a task or project name.`}
        </p>
      ) : (
        <ul aria-label="Backlog search results" className="max-h-80 space-y-075 overflow-y-auto">
          {results.map((item) => {
            const pending = pendingTaskId === item.taskId;
            return (
              <li key={item.taskId}>
                <Button
                  aria-label={`Add ${item.title} from ${item.project.name} to Today`}
                  className="h-auto min-h-11 w-full justify-between px-150 py-100 text-left whitespace-normal"
                  disabled={pendingTaskId !== null}
                  onClick={() => onAdd(item)}
                  type="button"
                  variant="default"
                >
                  <span>
                    <strong className="block text-text">{item.title}</strong>
                    <span className="block text-body-small text-text-subtle">{item.project.name}</span>
                  </span>
                  <span aria-hidden="true">{pending ? 'Adding…' : 'Add'}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export type BacklogPickerProps = {
  backlog: TodayBacklogItem[];
  onAdd: (taskId: string, plannedMinutes: number | null) => Promise<TodayActionOutcome>;
};

export function BacklogPicker({ backlog, onAdd }: BacklogPickerProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const openerRef = useRef<HTMLButtonElement>(null);

  const close = () => setOpen(false);
  const handleAdd = async (item: TodayBacklogItem) => {
    setPendingTaskId(item.taskId);
    const outcome = await onAdd(item.taskId, item.defaultPlannedMinutes);
    setPendingTaskId(null);
    if (outcome.ok) {
      setQuery(settleBacklogQuery(query, outcome));
      close();
    }
  };

  return (
    <>
      <Button className="min-h-11" onClick={() => setOpen(true)} ref={openerRef} type="button" variant="default">
        Add from backlog
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreOverlayFocus(openerRef.current);
          }}
        >
          <DialogHeader>
            <DialogTitle>Add work from your backlog</DialogTitle>
            <DialogDescription>Search active tasks across your projects. Tasks already planned today are not listed.</DialogDescription>
          </DialogHeader>
          <BacklogPickerPanel
            backlog={backlog}
            onAdd={(item) => void handleAdd(item)}
            pendingTaskId={pendingTaskId}
            query={query}
            setQuery={setQuery}
          />
          <div className="flex justify-end">
            <Button className="min-h-11" disabled={pendingTaskId !== null} onClick={close} type="button" variant="subtle">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
