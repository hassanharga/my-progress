import {
  clipSessionInterval,
  summarizeSessionIntervals,
  type SessionInterval,
} from '../../src/server/stats/session-intervals';
import { getUserPeriodBoundaries, type WeekStartDay } from '../../src/utils/time-stats';

const at = (value: string): Date => new Date(value);
const HOUR = 60 * 60;

describe('session interval clipping and union', () => {
  const boundary = {
    end: at('2026-09-13T12:00:00.000Z'),
    start: at('2026-09-13T08:00:00.000Z'),
  };
  const now = at('2026-09-13T11:00:00.000Z');

  it('returns zeroes for an empty interval set', () => {
    expect(summarizeSessionIntervals([], { ...boundary, now })).toEqual({
      trackedSeconds: 0,
      uniqueWorkingSeconds: 0,
    });
  });

  it.each([
    {
      expected: { end: at('2026-09-13T09:00:00.000Z'), start: boundary.start },
      interval: { endedAt: at('2026-09-13T09:00:00.000Z'), startedAt: at('2026-09-13T07:00:00.000Z') },
      label: 'crossing the start boundary',
    },
    {
      expected: { end: now, start: at('2026-09-13T10:00:00.000Z') },
      interval: { endedAt: null, startedAt: at('2026-09-13T10:00:00.000Z') },
      label: 'an open interval at the injected clock',
    },
  ])('clips $label', ({ expected, interval }) => {
    expect(clipSessionInterval(interval, { ...boundary, now })).toEqual(expected);
  });

  it('clips a session crossing the end boundary when now is later', () => {
    expect(
      clipSessionInterval(
        { endedAt: at('2026-09-13T13:00:00.000Z'), startedAt: at('2026-09-13T11:00:00.000Z') },
        { ...boundary, now: at('2026-09-13T14:00:00.000Z') }
      )
    ).toEqual({ end: boundary.end, start: at('2026-09-13T11:00:00.000Z') });
  });

  it.each([
    {
      interval: { endedAt: at('2026-09-13T07:00:00.000Z'), startedAt: at('2026-09-13T08:00:00.000Z') },
      label: 'negative',
    },
    {
      interval: { endedAt: at('2026-09-13T08:00:00.000Z'), startedAt: at('2026-09-13T07:00:00.000Z') },
      label: 'ending exactly at the start boundary',
    },
    {
      interval: { endedAt: at('2026-09-13T13:00:00.000Z'), startedAt: boundary.end },
      label: 'starting exactly at the end boundary',
    },
    {
      interval: { endedAt: null, startedAt: at('2026-09-13T11:30:00.000Z') },
      label: 'open but starting after now',
    },
  ])('ignores a $label interval', ({ interval }) => {
    expect(clipSessionInterval(interval, { ...boundary, now })).toBeNull();
  });

  it.each([
    {
      expectedTracked: 2 * HOUR,
      expectedUnique: 2 * HOUR,
      intervals: [
        { endedAt: at('2026-09-13T09:00:00.000Z'), startedAt: at('2026-09-13T08:00:00.000Z') },
        { endedAt: at('2026-09-13T10:00:00.000Z'), startedAt: at('2026-09-13T09:00:00.000Z') },
      ],
      label: 'adjacent',
    },
    {
      expectedTracked: 4 * HOUR,
      expectedUnique: 3 * HOUR,
      intervals: [
        { endedAt: at('2026-09-13T10:00:00.000Z'), startedAt: at('2026-09-13T08:00:00.000Z') },
        { endedAt: at('2026-09-13T11:00:00.000Z'), startedAt: at('2026-09-13T09:00:00.000Z') },
      ],
      label: 'partially overlapping',
    },
    {
      expectedTracked: 4 * HOUR,
      expectedUnique: 3 * HOUR,
      intervals: [
        { endedAt: at('2026-09-13T11:00:00.000Z'), startedAt: at('2026-09-13T08:00:00.000Z') },
        { endedAt: at('2026-09-13T10:00:00.000Z'), startedAt: at('2026-09-13T09:00:00.000Z') },
      ],
      label: 'nested',
    },
    {
      expectedTracked: 6 * HOUR,
      expectedUnique: 3 * HOUR,
      intervals: [
        { endedAt: at('2026-09-13T11:00:00.000Z'), startedAt: at('2026-09-13T08:00:00.000Z') },
        { endedAt: at('2026-09-13T11:00:00.000Z'), startedAt: at('2026-09-13T08:00:00.000Z') },
      ],
      label: 'fully overlapping',
    },
  ])('summarizes $label intervals', ({ expectedTracked, expectedUnique, intervals }) => {
    expect(summarizeSessionIntervals(intervals satisfies SessionInterval[], { ...boundary, now })).toEqual({
      trackedSeconds: expectedTracked,
      uniqueWorkingSeconds: expectedUnique,
    });
  });
});

describe('user-local period boundaries', () => {
  it.each([
    {
      expectedHours: 23,
      now: at('2026-03-08T16:00:00.000Z'),
      timezone: 'America/New_York',
    },
    {
      expectedHours: 25,
      now: at('2026-10-25T12:00:00.000Z'),
      timezone: 'Europe/Berlin',
    },
  ])('uses a $expectedHours-hour local day across DST in $timezone', ({ expectedHours, now, timezone }) => {
    const { day } = getUserPeriodBoundaries(now, timezone, 'MONDAY');
    expect((day.end.getTime() - day.start.getTime()) / 3_600_000).toBe(expectedHours);
  });

  it.each([
    { expected: '2026-09-13', weekStartDay: 'SUNDAY' as const },
    { expected: '2026-09-07', weekStartDay: 'MONDAY' as const },
    { expected: '2026-09-12', weekStartDay: 'SATURDAY' as const },
  ])('starts a $weekStartDay week on $expected', ({ expected, weekStartDay }) => {
    const { week } = getUserPeriodBoundaries(at('2026-09-13T12:00:00.000Z'), 'UTC', weekStartDay);
    expect(week.key).toBe(expected);
  });

  it('rejects an invalid IANA timezone', () => {
    expect(() => getUserPeriodBoundaries(new Date(), 'Mars/Olympus', 'MONDAY' satisfies WeekStartDay)).toThrow(
      'Invalid time zone'
    );
  });
});
