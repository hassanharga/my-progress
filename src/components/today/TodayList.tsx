import type { ReactNode } from 'react';

import type { TaskTransitionEvent } from '@/server/tasks/task-transition-types';
import type { TodayPlanItem } from '@/server/today/today-types';

import { TodayRow, type TodayRowOperation } from './TodayRow';

export type TodayListProps = {
  isPending?: (taskId: string, operation: TodayRowOperation) => boolean;
  items: TodayPlanItem[];
  onMove: (taskId: string, direction: 'UP' | 'DOWN') => void;
  onPlannedMinutesChange: (taskId: string, plannedMinutes: number | null) => void;
  onReturnToBacklog: (taskId: string) => void;
  onTransition: (taskId: string, event: TaskTransitionEvent) => void;
};

export function TodayList({ isPending, items, onMove, onPlannedMinutesChange, onReturnToBacklog, onTransition }: TodayListProps): ReactNode {
  return (
    <section aria-labelledby="today-plan-heading" className="today-plan">
      <div className="today-plan__heading">
        <div>
          <p className="today-plan__eyebrow">Flight plan</p>
          <h2 id="today-plan-heading">Today’s order</h2>
        </div>
        <p>{items.length} {items.length === 1 ? 'task' : 'tasks'}</p>
      </div>
      {items.length === 0 ? (
        <p className="today-plan__empty">Your plan is clear. Add work when you are ready.</p>
      ) : (
        <ol aria-label="Today plan" className="today-plan__list">
          {items.map((item, index) => (
            <TodayRow
              index={index}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              isPending={(operation) => isPending?.(item.taskId, operation) ?? false}
              item={item}
              key={item.id}
              onMove={onMove}
              onPlannedMinutesChange={onPlannedMinutesChange}
              onReturnToBacklog={onReturnToBacklog}
              onTransition={onTransition}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
