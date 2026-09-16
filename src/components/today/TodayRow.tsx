'use client';

import { useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import type { TaskTransitionEvent } from '@/server/tasks/task-transition-types';
import type { TodayPlanItem } from '@/server/today/today-types';

import { formatTodayMinutes } from './TodayHeader';

export type TodayRowOperation = 'move' | 'planned-minutes' | 'primary' | 'return-to-backlog';

export type TodayRowProps = {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isPending?: (operation: TodayRowOperation) => boolean;
  item: TodayPlanItem;
  onMove: (taskId: string, direction: 'UP' | 'DOWN') => void;
  onPlannedMinutesChange: (taskId: string, plannedMinutes: number | null) => void;
  onReturnToBacklog: (taskId: string) => void;
  onTransition: (taskId: string, event: TaskTransitionEvent) => void;
};

const statusLabel = (item: TodayPlanItem): string => {
  if (item.outcome === 'COMPLETED' || item.status === 'COMPLETED') return 'Complete';
  if (item.outcome === 'CANCELLED' || item.status === 'CANCELLED') return 'Cancelled';
  if (item.status === 'IN_PROGRESS') return 'In progress';
  if (item.status === 'PAUSED') return 'Paused';
  return 'Ready';
};

function PrimaryAction({ item, pending, onTransition }: Pick<TodayRowProps, 'item' | 'onTransition'> & { pending: boolean }): ReactNode {
  if (item.status === 'IN_PROGRESS') {
    return <Button className="today-plan-row__primary" data-primary-action="true" disabled={pending} onClick={() => onTransition(item.taskId, 'PAUSE')} type="button" variant="warning">Pause task</Button>;
  }
  if (item.status === 'READY' || item.status === 'PAUSED') {
    return <Button className="today-plan-row__primary" data-primary-action="true" disabled={pending} onClick={() => onTransition(item.taskId, 'START')} type="button">Start task</Button>;
  }
  const label = item.status === 'COMPLETED' ? 'Task completed' : 'Task cancelled';
  return <Button aria-label={label} className="today-plan-row__primary" data-primary-action="true" disabled type="button" variant="default">{label}</Button>;
}

export function TodayRow({ index, isFirst, isLast, isPending = () => false, item, onMove, onPlannedMinutesChange, onReturnToBacklog, onTransition }: TodayRowProps): ReactNode {
  const [plannedMinutesDraft, setPlannedMinutesDraft] = useState(item.plannedMinutes?.toString() ?? '');
  const [previousItem, setPreviousItem] = useState(item);
  const plannedMinutesPending = isPending('planned-minutes');
  const [wasPlannedMinutesPending, setWasPlannedMinutesPending] = useState(plannedMinutesPending);

  if (item !== previousItem) {
    setPreviousItem(item);
    if (wasPlannedMinutesPending && !plannedMinutesPending) {
      setPlannedMinutesDraft(item.plannedMinutes?.toString() ?? '');
    }
  }
  if (plannedMinutesPending !== wasPlannedMinutesPending) {
    setWasPlannedMinutesPending(plannedMinutesPending);
  }

  const updatePlannedMinutes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = plannedMinutesDraft.trim();
    onPlannedMinutesChange(item.taskId, text === '' ? null : Number(text));
  };

  return (
    <li className="today-plan-row" data-outcome={item.outcome}>
      <div aria-hidden="true" className="today-plan-row__position">{String(index + 1).padStart(2, '0')}</div>
      <div className="today-plan-row__identity">
        <p className="today-plan-row__project">{item.project.name}</p>
        <h3 className="today-plan-row__title">{item.title}</h3>
        <span className="today-plan-row__state" data-state={item.status}>{statusLabel(item)}</span>
      </div>
      <dl className="today-plan-row__timing">
        <div><dt>Planned</dt><dd>{item.plannedMinutes === null ? 'Not set' : `${formatTodayMinutes(item.plannedMinutes)} planned`}</dd></div>
        <div><dt>Actual</dt><dd>{formatTodayMinutes(Math.floor(item.actualSeconds / 60))} actual</dd></div>
      </dl>
      <PrimaryAction item={item} onTransition={onTransition} pending={isPending('primary')} />
      <div aria-label={`Plan actions for ${item.title}`} className="today-plan-row__secondary" role="group">
        <Button aria-label={`Move ${item.title} earlier`} disabled={isFirst || isPending('move')} onClick={() => onMove(item.taskId, 'UP')} size="sm" type="button" variant="default">Move earlier</Button>
        <Button aria-label={`Move ${item.title} later`} disabled={isLast || isPending('move')} onClick={() => onMove(item.taskId, 'DOWN')} size="sm" type="button" variant="default">Move later</Button>
        <form className="today-plan-row__estimate" onSubmit={updatePlannedMinutes}>
          <label htmlFor={`planned-minutes-${item.id}`}>Planned minutes</label>
          <input
            aria-label={`Planned minutes for ${item.title}`}
            autoComplete="off"
            disabled={plannedMinutesPending}
            id={`planned-minutes-${item.id}`}
            inputMode="numeric"
            max={1440}
            min={1}
            name="plannedMinutes"
            onChange={(event) => setPlannedMinutesDraft(event.currentTarget.value)}
            placeholder="Unset…"
            step={1}
            type="number"
            value={plannedMinutesDraft}
          />
          <Button disabled={plannedMinutesPending} size="sm" type="submit" variant="subtle">Save time</Button>
        </form>
        <Button disabled={isPending('return-to-backlog')} onClick={() => onReturnToBacklog(item.taskId)} size="sm" type="button" variant="subtle">Return to backlog</Button>
      </div>
    </li>
  );
}
