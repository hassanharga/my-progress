import { renderToStaticMarkup } from 'react-dom/server';

import { FocusDock, TodayClockProvider } from '@/components/today/FocusDock';
import { RunningProjectIndicators } from '@/components/today/RunningProjectIndicators';
import { TimeRunway } from '@/components/today/TimeRunway';
import type { TodayFocusItem, TodayRunningIndicator } from '@/server/today/today-types';

const focus = (overrides: Partial<TodayFocusItem> = {}): TodayFocusItem => ({
  actualSeconds: 600,
  createdAt: '2026-09-15T08:00:00.000Z',
  currentNextStep: 'Write the empty state',
  openSessionStartedAt: '2026-09-15T09:00:00.000Z',
  planItemId: 'plan-1',
  plannedMinutes: 30,
  project: { id: 'project-1', name: 'My Progress' },
  source: 'planned',
  status: 'IN_PROGRESS',
  taskId: 'task-1',
  title: 'Shape the Today cockpit',
  ...overrides,
});

describe('Today focus markup', () => {
  it('names the runway and exposes numeric and text progress equivalents', () => {
    const html = renderToStaticMarkup(<TimeRunway elapsedSeconds={900} plannedMinutes={30} status="IN_PROGRESS" />);

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Time runway for current task"');
    expect(html).toContain('aria-valuenow="15"');
    expect(html).toContain('aria-valuemax="30"');
    expect(html).toContain('15m remaining · 15m elapsed');
    expect(html).toContain('In progress');
  });

  it('foregrounds the task, project, next step, and state-aware named controls', () => {
    const html = renderToStaticMarkup(
      <TodayClockProvider initialNowMs={Date.parse('2026-09-15T09:05:00.000Z')}>
        <FocusDock focus={focus()} onComplete={() => undefined} onLog={() => undefined} onPause={() => undefined} onStart={() => undefined} />
      </TodayClockProvider>
    );

    expect(html).toContain('Shape the Today cockpit');
    expect(html).toContain('My Progress');
    expect(html).toContain('Write the empty state');
    expect(html).toContain('Pause task');
    expect(html).toContain('Complete task');
    expect(html).toContain('Log progress');
    expect(html).not.toContain('Start task');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('10m');
    expect(html).not.toContain('15m elapsed on Shape the Today cockpit');
  });

  it('renders direct guidance when no task is focused', () => {
    const html = renderToStaticMarkup(
      <TodayClockProvider initialNowMs={0}>
        <FocusDock focus={null} onComplete={() => undefined} onLog={() => undefined} onPause={() => undefined} onStart={() => undefined} />
      </TodayClockProvider>
    );

    expect(html).toContain('No task in focus');
    expect(html).toContain('Start a task from today’s plan');
  });

  it.each(['READY', 'PAUSED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS'] as const)('does not expose a ticking live timer for %s work without an open session', (status) => {
    const html = renderToStaticMarkup(
      <TodayClockProvider initialNowMs={Date.parse('2026-09-15T09:05:00.000Z')}>
        <FocusDock
          focus={focus({ openSessionStartedAt: null, status })}
          onComplete={() => undefined}
          onLog={() => undefined}
          onPause={() => undefined}
          onStart={() => undefined}
        />
      </TodayClockProvider>
    );

    expect(html).not.toContain('aria-live="polite"');
    expect(html).not.toContain('elapsed on Shape the Today cockpit');
  });

  it('keeps other running projects visible as named compact indicators', () => {
    const indicators: TodayRunningIndicator[] = [
      {
        elapsedSeconds: 300,
        project: { id: 'project-2', name: 'Portfolio' },
        sessionId: 'session-2',
        startedAt: '2026-09-15T09:03:00.000Z',
        taskId: 'task-2',
        title: 'Polish case study',
      },
    ];
    const html = renderToStaticMarkup(
      <TodayClockProvider initialNowMs={Date.parse('2026-09-15T09:05:00.000Z')}>
        <RunningProjectIndicators indicators={indicators} />
      </TodayClockProvider>
    );

    expect(html).toContain('aria-label="Work running in other projects"');
    expect(html).toContain('Portfolio');
    expect(html).toContain('Polish case study');
    expect(html).toContain('Running');
    expect(html).toContain('5m');
    expect(html).not.toContain('7m');
  });
});
