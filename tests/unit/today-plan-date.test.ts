import { derivePlanDate, getPlanDateBoundary, parsePlanDateKey } from '../../src/server/today/plan-date';

describe('Today plan-date normalization', () => {
  it.each([
    {
      expected: '2026-01-02',
      now: new Date('2026-01-01T10:30:00.000Z'),
      timezone: 'Pacific/Kiritimati',
    },
    {
      expected: '2025-12-31',
      now: new Date('2026-01-01T05:30:00.000Z'),
      timezone: 'Pacific/Honolulu',
    },
  ])('derives $expected at the local-day boundary in $timezone', ({ expected, now, timezone }) => {
    expect(derivePlanDate(now, timezone)).toEqual({
      date: new Date(`${expected}T00:00:00.000Z`),
      key: expected,
    });
  });

  it('rejects an invalid IANA timezone', () => {
    expect(() => derivePlanDate(new Date('2026-01-01T12:00:00.000Z'), 'Mars/Olympus')).toThrow(RangeError);
  });

  it.each(['2026-1-01', '26-01-01', '2026/01/01', ' 2026-01-01', '2026-01-01T00:00:00.000Z'])(
    'rejects non-canonical date key %s',
    (key) => {
      expect(() => parsePlanDateKey(key)).toThrow('Plan date must use YYYY-MM-DD');
    }
  );

  it.each(['2026-02-30', '2025-02-29', '2026-04-31', '2026-13-01', '2026-00-10'])(
    'rejects impossible calendar date %s',
    (key) => {
      expect(() => parsePlanDateKey(key)).toThrow('Plan date is not a real calendar date');
    }
  );

  it('round-trips an explicit calendar key as UTC midnight without timezone conversion', () => {
    const result = parsePlanDateKey('2026-09-15');

    expect(result.key).toBe('2026-09-15');
    expect(result.date.toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });

  it.each([
    {
      end: '2026-03-09T04:00:00.000Z',
      key: '2026-03-08',
      start: '2026-03-08T05:00:00.000Z',
      timezone: 'America/New_York',
    },
    {
      end: '2026-10-25T23:00:00.000Z',
      key: '2026-10-25',
      start: '2026-10-24T22:00:00.000Z',
      timezone: 'Europe/Berlin',
    },
  ])('returns the exact local-day boundary for $key in $timezone', ({ end, key, start, timezone }) => {
    expect(getPlanDateBoundary(key, timezone)).toEqual({
      end: new Date(end),
      key,
      start: new Date(start),
    });
  });
});
