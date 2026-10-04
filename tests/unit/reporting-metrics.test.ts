import type { ReportingQuery } from '../../src/schema/reporting';
import { calculateReportingFacts } from '../../src/server/reporting/calculate-reporting';
import type { ReportingSource } from '../../src/server/reporting/reporting-types';

const at = (value: string): Date => new Date(value);
const query = (from: string, to = from): ReportingQuery => ({
  from,
  to,
  projectId: null,
  taskState: 'ALL',
  correctionState: 'ALL',
  page: 1,
});
const empty = (): ReportingSource => ({ projects: [], tasks: [], plans: [], sessions: [] });
const facts = (
  source: ReportingSource,
  options: {
    from: string;
    to?: string;
    timezone?: string;
    weekStartDay?: 'MONDAY' | 'SUNDAY' | 'SATURDAY';
    now?: string;
  }
) =>
  calculateReportingFacts({
    source,
    query: query(options.from, options.to),
    timezone: options.timezone ?? 'UTC',
    weekStartDay: options.weekStartDay ?? 'MONDAY',
    now: at(options.now ?? '2026-09-30T00:00:00.000Z'),
  });

describe('reporting facts', () => {
  it('keeps selected empty dates in chronological daily and weekly review', () => {
    const result = facts(empty(), { from: '2026-09-13', to: '2026-09-14' });
    expect(result).toMatchObject({
      plannedMinutes: 0,
      missingEstimateCount: 0,
      plannedTaskSeconds: 0,
      unplannedSeconds: 0,
      trackedSeconds: 0,
      uniqueWorkingSeconds: 0,
      overlapSeconds: 0,
      varianceSeconds: 0,
      overrunCount: 0,
      sessionSplitCount: 0,
      daily: [{ date: '2026-09-13' }, { date: '2026-09-14' }],
      weekly: [{ weekStart: '2026-09-07' }, { weekStart: '2026-09-14' }],
      projects: [],
    });
    expect(result.daily.map((day) => day.trackedSeconds)).toEqual([0, 0]);
  });

  it('keeps missing estimates out of comparable planned minutes and variance while showing their work', () => {
    const source = empty();
    source.projects = [{ id: 'p', name: 'Project' }];
    source.tasks = [{ id: 't', projectId: 'p', title: 'Task', status: 'READY' }];
    source.plans = [{ taskId: 't', projectId: 'p', planDate: at('2026-09-13T00:00:00.000Z'), plannedMinutes: null }];
    source.sessions = [
      {
        id: 's',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-09-13T08:00:00Z'),
        endedAt: at('2026-09-13T08:30:05Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, { from: '2026-09-13' });
    expect(result).toMatchObject({
      plannedMinutes: 0,
      missingEstimateCount: 1,
      plannedTaskSeconds: 0,
      missingEstimateWorkedSeconds: 1805,
      unplannedSeconds: 0,
      trackedSeconds: 1805,
      varianceSeconds: 0,
      overrunCount: 0,
    });
    expect(result.daily[0]).toMatchObject({
      missingEstimateCount: 1,
      missingEstimateWorkedSeconds: 1805,
      varianceSeconds: 0,
    });
  });

  it('counts work without a same-day plan as unplanned and keeps exact seconds', () => {
    const source = empty();
    source.projects = [{ id: 'p', name: 'Project' }];
    source.tasks = [{ id: 't', projectId: 'p', title: 'Task', status: 'READY' }];
    source.sessions = [
      {
        id: 's',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-09-13T08:00:00Z'),
        endedAt: at('2026-09-13T08:01:07Z'),
        correctedAt: null,
      },
    ];
    expect(facts(source, { from: '2026-09-13' })).toMatchObject({
      unplannedSeconds: 67,
      trackedSeconds: 67,
      uniqueWorkingSeconds: 67,
      varianceSeconds: 0,
    });
  });

  it('uses corrected timestamps supplied by the read contract and clips an open session at now', () => {
    const source = empty();
    source.sessions = [
      {
        id: 'corrected',
        taskId: 'a',
        projectId: 'p',
        startedAt: at('2026-09-13T09:00:00Z'),
        endedAt: at('2026-09-13T09:10:00Z'),
        correctedAt: at('2026-09-14T00:00:00Z'),
      },
      {
        id: 'open',
        taskId: 'b',
        projectId: 'p',
        startedAt: at('2026-09-13T10:00:00Z'),
        endedAt: null,
        correctedAt: null,
      },
    ];
    expect(facts(source, { from: '2026-09-13', now: '2026-09-13T10:00:37Z' })).toMatchObject({
      trackedSeconds: 637,
      uniqueWorkingSeconds: 637,
      unplannedSeconds: 637,
    });
  });

  it('splits work at local midnight and counts an overrun only for the estimated plan date', () => {
    const source = empty();
    source.plans = [{ taskId: 't', projectId: 'p', planDate: at('2026-09-13T00:00:00Z'), plannedMinutes: 20 }];
    source.sessions = [
      {
        id: 's',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-09-13T23:30:00Z'),
        endedAt: at('2026-09-14T00:15:10Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, { from: '2026-09-13', to: '2026-09-14' });
    expect(
      result.daily.map((day) => ({
        date: day.date,
        plannedTaskSeconds: day.plannedTaskSeconds,
        unplannedSeconds: day.unplannedSeconds,
        varianceSeconds: day.varianceSeconds,
        overrunCount: day.overrunCount,
      }))
    ).toEqual([
      { date: '2026-09-13', plannedTaskSeconds: 1800, unplannedSeconds: 0, varianceSeconds: 600, overrunCount: 1 },
      { date: '2026-09-14', plannedTaskSeconds: 0, unplannedSeconds: 910, varianceSeconds: 0, overrunCount: 0 },
    ]);
    expect(result.sessionSplitCount).toBe(0);
  });

  it('handles a spring-forward midnight gap using real local boundaries', () => {
    const source = empty();
    source.sessions = [
      {
        id: 's',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2018-11-04T02:30:00Z'),
        endedAt: at('2018-11-04T03:30:00Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, {
      from: '2018-11-03',
      to: '2018-11-04',
      timezone: 'America/Sao_Paulo',
      now: '2018-11-05T00:00:00Z',
    });
    expect(result.daily.map((day) => day.trackedSeconds)).toEqual([1800, 1800]);
    expect(result.trackedSeconds).toBe(3600);
  });

  it('uses 23-hour and 25-hour local days across daylight saving changes', () => {
    const source = empty();
    source.sessions = [
      {
        id: 's',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-03-08T05:00:00Z'),
        endedAt: at('2026-03-09T04:00:00Z'),
        correctedAt: null,
      },
    ];
    expect(
      facts(source, { from: '2026-03-08', timezone: 'America/New_York', now: '2026-03-10T00:00:00Z' }).daily[0]
        .trackedSeconds
    ).toBe(23 * 3600);
    source.sessions = [
      {
        id: 's',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-11-01T04:00:00Z'),
        endedAt: at('2026-11-02T05:00:00Z'),
        correctedAt: null,
      },
    ];
    expect(
      facts(source, { from: '2026-11-01', timezone: 'America/New_York', now: '2026-11-03T00:00:00Z' }).daily[0]
        .trackedSeconds
    ).toBe(25 * 3600);
  });

  it('discloses cross-project overlap while sorting project allocation by name then ID', () => {
    const source = empty();
    source.projects = [
      { id: 'z', name: 'Same' },
      { id: 'b', name: 'Same' },
      { id: 'a', name: 'Alpha' },
    ];
    source.sessions = [
      {
        id: 's2',
        taskId: 't2',
        projectId: 'z',
        startedAt: at('2026-09-13T09:00:00Z'),
        endedAt: at('2026-09-13T10:00:00Z'),
        correctedAt: null,
      },
      {
        id: 's1',
        taskId: 't1',
        projectId: 'b',
        startedAt: at('2026-09-13T09:30:00Z'),
        endedAt: at('2026-09-13T10:30:00Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, { from: '2026-09-13' });
    expect(result).toMatchObject({ trackedSeconds: 7200, uniqueWorkingSeconds: 5400, overlapSeconds: 1800 });
    expect(result.projects.map((project) => [project.projectId, project.trackedSeconds])).toEqual([
      ['a', 0],
      ['b', 3600],
      ['z', 3600],
    ]);
  });

  it('counts resumptions on a local date without counting one cross-midnight session twice', () => {
    const source = empty();
    source.sessions = [
      {
        id: 's1',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-09-13T08:00:00Z'),
        endedAt: at('2026-09-13T08:10:00Z'),
        correctedAt: null,
      },
      {
        id: 's2',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-09-13T09:00:00Z'),
        endedAt: at('2026-09-13T09:10:00Z'),
        correctedAt: null,
      },
      {
        id: 's3',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-09-13T23:50:00Z'),
        endedAt: at('2026-09-14T00:10:00Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, { from: '2026-09-13', to: '2026-09-14' });
    expect(result.sessionSplitCount).toBe(2);
    expect(result.daily.map((day) => day.sessionSplitCount)).toEqual([2, 0]);
  });

  it('attributes a later session to Tuesday and reconciles daily, weekly, project, and range counts', () => {
    const source = empty();
    source.projects = [{ id: 'p', name: 'Project' }];
    source.sessions = [
      {
        id: 'tuesday',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-29T09:00:00Z'),
        endedAt: at('2026-09-29T09:10:00Z'),
        correctedAt: null,
      },
      {
        id: 'monday',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-28T09:00:00Z'),
        endedAt: at('2026-09-28T09:10:00Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, { from: '2026-09-28', to: '2026-09-29' });
    expect(result.daily.map(({ date, sessionSplitCount }) => [date, sessionSplitCount])).toEqual([
      ['2026-09-28', 0],
      ['2026-09-29', 1],
    ]);
    expect(result.weekly.map(({ weekStart, sessionSplitCount }) => [weekStart, sessionSplitCount])).toEqual([
      ['2026-09-28', 1],
    ]);
    expect(result.projects[0]).toMatchObject({ sessionCount: 2, sessionSplitCount: 1 });
    expect(result.sessionSplitCount).toBe(1);
  });

  it('attributes a Sunday-to-Monday resumption to the new week', () => {
    const source = empty();
    source.sessions = [
      {
        id: 'monday',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-14T09:00:00Z'),
        endedAt: at('2026-09-14T09:10:00Z'),
        correctedAt: null,
      },
      {
        id: 'sunday',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-13T09:00:00Z'),
        endedAt: at('2026-09-13T09:10:00Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, { from: '2026-09-13', to: '2026-09-14' });
    expect(result.daily.map((day) => day.sessionSplitCount)).toEqual([0, 1]);
    expect(result.weekly.map(({ weekStart, sessionSplitCount }) => [weekStart, sessionSplitCount])).toEqual([
      ['2026-09-07', 0],
      ['2026-09-14', 1],
    ]);
  });

  it('counts distinct matching sessions once while excluding out-of-range and already-filtered sessions', () => {
    const source = empty();
    source.projects = [{ id: 'p', name: 'Project' }];
    source.sessions = [
      {
        id: 'before',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-27T08:00:00Z'),
        endedAt: at('2026-09-27T08:10:00Z'),
        correctedAt: null,
      },
      {
        id: 'overlap',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-27T23:50:00Z'),
        endedAt: at('2026-09-28T00:10:00Z'),
        correctedAt: null,
      },
      {
        id: 'monday',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-28T09:00:00Z'),
        endedAt: at('2026-09-28T09:10:00Z'),
        correctedAt: null,
      },
      {
        id: 'monday',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-28T09:00:00Z'),
        endedAt: at('2026-09-28T09:10:00Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, { from: '2026-09-28' });
    expect(result.daily[0].sessionSplitCount).toBe(1);
    expect(result.projects[0].sessionSplitCount).toBe(1);
    expect(result.sessionSplitCount).toBe(1);

    source.sessions = source.sessions.filter((session) => session.id !== 'overlap');
    expect(facts(source, { from: '2026-09-28' }).sessionSplitCount).toBe(0);
  });

  it('clips attribution for a later pre-range session to the first selected local date', () => {
    const source = empty();
    source.sessions = [
      {
        id: 'later',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-27T23:30:00Z'),
        endedAt: at('2026-09-28T00:30:00Z'),
        correctedAt: null,
      },
      {
        id: 'first',
        projectId: 'p',
        taskId: 't',
        startedAt: at('2026-09-27T23:00:00Z'),
        endedAt: at('2026-09-28T00:15:00Z'),
        correctedAt: null,
      },
    ];
    const result = facts(source, { from: '2026-09-28', to: '2026-09-29' });
    expect(result.daily.map((day) => day.sessionSplitCount)).toEqual([1, 0]);
    expect(result.weekly[0].sessionSplitCount).toBe(1);
    expect(result.sessionSplitCount).toBe(1);
  });

  it('groups the same daily facts by the saved week start, including a partial first week', () => {
    const source = empty();
    source.sessions = [
      {
        id: 's',
        taskId: 't',
        projectId: 'p',
        startedAt: at('2026-09-13T23:59:30Z'),
        endedAt: at('2026-09-14T00:00:30Z'),
        correctedAt: null,
      },
    ];
    const monday = facts(source, { from: '2026-09-13', to: '2026-09-14', weekStartDay: 'MONDAY' });
    const sunday = facts(source, { from: '2026-09-13', to: '2026-09-14', weekStartDay: 'SUNDAY' });
    expect(monday.weekly.map((week) => [week.weekStart, week.trackedSeconds])).toEqual([
      ['2026-09-07', 30],
      ['2026-09-14', 30],
    ]);
    expect(sunday.weekly.map((week) => [week.weekStart, week.trackedSeconds])).toEqual([['2026-09-13', 60]]);
  });
});
