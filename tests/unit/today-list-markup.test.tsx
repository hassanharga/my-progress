import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { CarryoverReview } from '@/components/today/CarryoverReview';
import { DailySummary } from '@/components/today/DailySummary';
import { TodayHeader } from '@/components/today/TodayHeader';
import { TodayList } from '@/components/today/TodayList';
import type { TodayCarryoverItem, TodayPlanItem, TodaySummary, TodayWorkload } from '@/server/today/today-types';

const planItem = (overrides: Partial<TodayPlanItem> = {}): TodayPlanItem => ({
  actualSeconds: 1_500,
  createdAt: '2026-09-15T08:00:00.000Z',
  currentNextStep: null,
  id: 'plan-1',
  openSessionStartedAt: null,
  outcome: 'OPEN',
  plannedMinutes: 30,
  position: 0,
  project: { id: 'project-1', name: 'My Progress' },
  status: 'READY',
  taskId: 'task-1',
  title: 'Shape the Today cockpit',
  ...overrides,
});

const noop = () => undefined;
const todayRowSource = readFileSync(resolve(process.cwd(), 'src/components/today/TodayRow.tsx'), 'utf8');

describe('Today planning markup', () => {
  it('renders the plan as an ordered, source-ordered list with complete row information', () => {
    const items = [
      planItem(),
      planItem({ id: 'plan-2', position: 1, project: { id: 'project-2', name: 'Portfolio' }, status: 'IN_PROGRESS', taskId: 'task-2', title: 'Polish the case study' }),
    ];
    const html = renderToStaticMarkup(
      <TodayList
        items={items}
        onMove={noop}
        onPlannedMinutesChange={noop}
        onReturnToBacklog={noop}
        onTransition={noop}
      />
    );

    expect(html).toContain('<ol');
    expect(html).toContain('aria-label="Today plan"');
    expect(html.indexOf('Shape the Today cockpit')).toBeLessThan(html.indexOf('Polish the case study'));
    expect(html).toContain('My Progress');
    expect(html).toContain('30m planned');
    expect(html).toContain('25m actual');
    expect(html).toContain('Ready');
  });

  it('selects exactly one primary control for open, running, complete, and cancelled rows', () => {
    const items = [
      planItem(),
      planItem({ id: 'plan-2', position: 1, status: 'IN_PROGRESS', taskId: 'task-2', title: 'Running task' }),
      planItem({ id: 'plan-3', outcome: 'COMPLETED', position: 2, status: 'COMPLETED', taskId: 'task-3', title: 'Complete task' }),
      planItem({ id: 'plan-4', outcome: 'CANCELLED', position: 3, status: 'CANCELLED', taskId: 'task-4', title: 'Cancelled task' }),
    ];
    const html = renderToStaticMarkup(
      <TodayList items={items} onMove={noop} onPlannedMinutesChange={noop} onReturnToBacklog={noop} onTransition={noop} />
    );

    expect(html.match(/data-primary-action="true"/g)).toHaveLength(4);
    expect(html).toContain('Start task');
    expect(html).toContain('Pause task');
    expect(html).toContain('Task completed');
    expect(html).toContain('Task cancelled');
  });

  it('keeps reorder, planned-time, and backlog controls in the markup with edge moves disabled', () => {
    const html = renderToStaticMarkup(
      <TodayList
        items={[planItem(), planItem({ id: 'plan-2', position: 1, taskId: 'task-2', title: 'Second task' })]}
        onMove={noop}
        onPlannedMinutesChange={noop}
        onReturnToBacklog={noop}
        onTransition={noop}
      />
    );

    expect(html).toContain('aria-label="Move Shape the Today cockpit earlier" disabled=""');
    expect(html).toContain('aria-label="Move Second task later" disabled=""');
    expect(html).toContain('aria-label="Planned minutes for Shape the Today cockpit"');
    expect(html).toContain('Return to backlog');
    expect(html).not.toContain('class="hidden"');
  });

  it('synchronizes the planned-minutes draft whenever a canonical row object is replaced', () => {
    expect(todayRowSource).toContain('if (item !== previousItem)');
    expect(todayRowSource).toContain('if (wasPlannedMinutesPending && !plannedMinutesPending)');
    expect(todayRowSource).toContain('value={plannedMinutesDraft}');
    expect(todayRowSource).not.toContain('defaultValue={item.plannedMinutes');
  });

  it('offers all carryover resolutions and names the source date', () => {
    const item: TodayCarryoverItem = {
      ...planItem(),
      sourcePlanDate: '2026-09-14',
    };
    const html = renderToStaticMarkup(
      <CarryoverReview items={[item]} onKeepToday={noop} onMoveToDate={noop} onReturnToBacklog={noop} />
    );

    expect(html).toContain('Unfinished from September 14, 2026');
    expect(html).toContain('Keep today');
    expect(html).toContain('Move to date');
    expect(html).toContain('Return to backlog');
    expect(html).toContain('type="date"');
  });

  it('renders numeric workload and a compact daily summary without making over-capacity blocking', () => {
    const workload: TodayWorkload = {
      actualSeconds: 3_600,
      capacityMinutes: 480,
      plannedMinutes: 540,
      remainingMinutes: -60,
      state: 'over',
      utilizationPercent: 113,
    };
    const summary: TodaySummary = { actualSeconds: 3_600, cancelledCount: 1, completedCount: 2, openCount: 3, totalCount: 6 };
    const header = renderToStaticMarkup(<TodayHeader planDate="2026-09-15" timezone="Africa/Cairo" workload={workload} />);
    const dailySummary = renderToStaticMarkup(<DailySummary summary={summary} workload={workload} />);

    expect(header).toContain('9h planned of 8h · 1h over capacity');
    expect(header).toContain('role="status"');
    expect(header).toContain('aria-valuenow="480"');
    expect(header).toContain('aria-valuemax="480"');
    expect(header).toContain('aria-valuetext="9h planned of 8h · 1h over capacity"');
    expect(header).not.toContain('disabled');
    expect(dailySummary).toContain('2 completed');
    expect(dailySummary).toContain('3 open');
    expect(dailySummary).toContain('1h actual');
  });

  it('uses numeric copy without an indeterminate meter when daily capacity is unset', () => {
    const workload: TodayWorkload = {
      actualSeconds: 0,
      capacityMinutes: null,
      plannedMinutes: 90,
      remainingMinutes: null,
      state: 'unset',
      utilizationPercent: null,
    };

    const html = renderToStaticMarkup(<TodayHeader planDate="2026-09-15" timezone="Africa/Cairo" workload={workload} />);

    expect(html).toContain('1h 30m planned · No daily capacity set');
    expect(html).not.toContain('role="progressbar"');
  });
});
