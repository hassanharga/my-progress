import type { FormEvent, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import type { TodayCarryoverItem } from '@/server/today/today-types';

import { formatTodayMinutes } from './TodayHeader';

export type CarryoverOperation = 'keep' | 'move' | 'backlog';

export type CarryoverReviewProps = {
  isPending?: (taskId: string, operation: CarryoverOperation) => boolean;
  items: TodayCarryoverItem[];
  onKeepToday: (taskId: string, sourcePlanDate: string) => void;
  onMoveToDate: (taskId: string, targetPlanDate: string) => void;
  onReturnToBacklog: (taskId: string) => void;
};

const formatSourceDate = (key: string): string => {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
};

export function CarryoverReview({ isPending, items, onKeepToday, onMoveToDate, onReturnToBacklog }: CarryoverReviewProps): ReactNode {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="carryover-heading" className="today-carryover">
      <div className="today-carryover__heading">
        <p className="today-plan__eyebrow">Review before planning</p>
        <h2 id="carryover-heading">Unfinished work</h2>
      </div>
      <ul className="today-carryover__list">
        {items.map((item) => {
          const moveToDate = (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('targetPlanDate');
            if (typeof value === 'string' && value) onMoveToDate(item.taskId, value);
          };
          return (
            <li className="today-carryover__item" key={item.id}>
              <div>
                <p className="today-carryover__source">Unfinished from {formatSourceDate(item.sourcePlanDate)}</p>
                <h3>{item.title}</h3>
                <p>{item.project.name} · {item.plannedMinutes === null ? 'No estimate' : `${formatTodayMinutes(item.plannedMinutes)} planned`}</p>
              </div>
              <div className="today-carryover__actions">
                <Button disabled={isPending?.(item.taskId, 'keep')} onClick={() => onKeepToday(item.taskId, item.sourcePlanDate)} type="button">Keep today</Button>
                <form onSubmit={moveToDate}>
                  <label className="sr-only" htmlFor={`carryover-date-${item.id}`}>New date for {item.title}</label>
                  <input autoComplete="off" id={`carryover-date-${item.id}`} name="targetPlanDate" required type="date" />
                  <Button disabled={isPending?.(item.taskId, 'move')} type="submit" variant="default">Move to date</Button>
                </form>
                <Button disabled={isPending?.(item.taskId, 'backlog')} onClick={() => onReturnToBacklog(item.taskId)} type="button" variant="subtle">Return to backlog</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
