import { parseReportingQuery, resolveReportingBoundary } from '../../src/server/reporting/reporting-scope';

const now = new Date('2026-01-01T05:30:00.000Z');
const timezone = 'Pacific/Honolulu';
const projectId = 'a70bc4d8-4831-4f51-9427-9ad40bc2e1fb';

describe('reporting URL scope', () => {
  it('defaults to 28 user-local dates including today across a year boundary', () => {
    expect(parseReportingQuery({ searchParams: {}, mode: 'insights', now, timezone })).toEqual({
      ok: true,
      query: {
        from: '2025-12-04',
        to: '2025-12-31',
        projectId: null,
        taskState: 'ALL',
        correctionState: 'ALL',
        page: 1,
      },
    });
  });

  it('accepts the complete Reports scope without changing filters', () => {
    const searchParams = new URLSearchParams({
      from: '2026-03-08',
      to: '2026-03-10',
      projectId,
      taskState: 'IN_PROGRESS',
      correctionState: 'CORRECTED',
      page: '12',
    });

    expect(parseReportingQuery({ searchParams, mode: 'reports', now, timezone })).toEqual({
      ok: true,
      query: {
        from: '2026-03-08',
        to: '2026-03-10',
        projectId,
        taskState: 'IN_PROGRESS',
        correctionState: 'CORRECTED',
        page: 12,
      },
    });
  });

  it('keeps Insights on all task and correction states with first-page scope', () => {
    const result = parseReportingQuery({
      searchParams: { taskState: 'COMPLETED', correctionState: 'CORRECTED', page: '4' },
      mode: 'insights',
      now,
      timezone,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.taskState).toBe('ALL');
      expect(result.query.correctionState).toBe('ALL');
      expect(result.query.page).toBe(1);
    }
  });

  it('treats an empty project selection as all owned projects', () => {
    const result = parseReportingQuery({ searchParams: { projectId: '' }, mode: 'reports', now, timezone });
    expect(result.ok && result.query.projectId).toBeNull();
  });

  it('accepts a large positive page without an arbitrary range cap', () => {
    const result = parseReportingQuery({ searchParams: { page: '1000000' }, mode: 'reports', now, timezone });
    expect(result.ok && result.query.page).toBe(1000000);
  });

  it.each([
    { from: '2026-03-08', to: undefined },
    { from: undefined, to: '2026-03-08' },
  ])('requires both explicit dates together: $from / $to', ({ from, to }) => {
    const result = parseReportingQuery({ searchParams: { from, to }, mode: 'reports', now, timezone });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty(from ? 'to' : 'from');
  });

  it.each(['2026-02-30', '2026-1-03', ' 2026-01-03'])(
    'rejects invalid date %s and retains the entered text',
    (from) => {
      const result = parseReportingQuery({
        searchParams: { from, to: '2026-03-01' },
        mode: 'reports',
        now,
        timezone,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.values.from).toBe(from);
        expect(result.values.to).toBe('2026-03-01');
        expect(result.errors.from).toBeTruthy();
      }
    }
  );

  it('rejects a reversed range without replacing either date', () => {
    const result = parseReportingQuery({
      searchParams: { from: '2026-03-11', to: '2026-03-08' },
      mode: 'reports',
      now,
      timezone,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.values.from).toBe('2026-03-11');
      expect(result.values.to).toBe('2026-03-08');
      expect(result.errors.to).toBeTruthy();
    }
  });

  it.each([
    ['2026-01-15', '2026-07-14', true],
    ['2026-01-15', '2026-07-15', false],
    ['2026-08-31', '2027-02-27', true],
    ['2026-08-31', '2027-02-28', false],
    ['2023-08-31', '2024-02-28', true],
    ['2023-08-31', '2024-02-29', false],
  ])('applies the clamped six-calendar-month limit to %s through %s', (from, to, allowed) => {
    const result = parseReportingQuery({ searchParams: { from, to }, mode: 'reports', now, timezone });
    expect(result.ok).toBe(allowed);
    if (!result.ok) {
      expect(result.values).toEqual(expect.objectContaining({ from, to }));
      expect(result.errors.to).toMatch(/six calendar months/i);
    }
  });

  it('keeps the specific error for malformed and reversed ranges', () => {
    const malformed = parseReportingQuery({
      searchParams: { from: '2026-02-30', to: '2026-12-31' },
      mode: 'reports',
      now,
      timezone,
    });
    const reversed = parseReportingQuery({
      searchParams: { from: '2026-12-31', to: '2026-01-01' },
      mode: 'reports',
      now,
      timezone,
    });
    expect(malformed.ok).toBe(false);
    expect(reversed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.errors.from).toMatch(/real date/i);
    if (!reversed.ok) expect(reversed.errors.to).toMatch(/on or after/i);
  });

  it('rejects a programmatic over-limit query before resolving its dates', () => {
    expect(() =>
      resolveReportingBoundary(
        {
          from: '2026-01-15',
          to: '2026-07-15',
          projectId: null,
          taskState: 'ALL',
          correctionState: 'ALL',
          page: 1,
        },
        'UTC'
      )
    ).toThrow(RangeError);
  });

  it.each([
    { key: 'projectId', value: 'not-a-uuid' },
    { key: 'taskState', value: 'DONE' },
    { key: 'correctionState', value: 'EDITED' },
    { key: 'page', value: '0' },
    { key: 'page', value: '-1' },
    { key: 'page', value: '1.5' },
    { key: 'page', value: '9007199254740992' },
  ])('rejects invalid $key=$value and retains it', ({ key, value }) => {
    const result = parseReportingQuery({ searchParams: { [key]: value }, mode: 'reports', now, timezone });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.values[key]).toBe(value);
      expect(result.errors[key]).toBeTruthy();
    }
  });

  it.each(['from', 'to', 'projectId', 'taskState', 'correctionState', 'page'])(
    'rejects repeated %s values from a URL',
    (key) => {
      const searchParams = new URLSearchParams({ from: '2026-03-08', to: '2026-03-09', page: '1' });
      searchParams.append(key, searchParams.get(key) ?? '1');
      const result = parseReportingQuery({ searchParams, mode: 'reports', now, timezone });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[key]).toBeTruthy();
    }
  );

  it('rejects repeated values represented by an App Router array', () => {
    const result = parseReportingQuery({
      searchParams: { page: ['2', '3'] },
      mode: 'reports',
      now,
      timezone,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.values.page).toBe('2');
      expect(result.errors.page).toBeTruthy();
    }
  });

  it('resolves an inclusive spring-forward date to its 23-hour UTC interval', () => {
    expect(
      resolveReportingBoundary(
        { from: '2026-03-08', to: '2026-03-08', projectId: null, taskState: 'ALL', correctionState: 'ALL', page: 1 },
        'America/New_York'
      )
    ).toEqual({
      start: new Date('2026-03-08T05:00:00.000Z'),
      end: new Date('2026-03-09T04:00:00.000Z'),
      dayKeys: ['2026-03-08'],
    });
  });

  it('resolves an inclusive fall-back range to its 25-hour day and next-day boundary', () => {
    expect(
      resolveReportingBoundary(
        { from: '2026-11-01', to: '2026-11-02', projectId: null, taskState: 'ALL', correctionState: 'ALL', page: 1 },
        'America/New_York'
      )
    ).toEqual({
      start: new Date('2026-11-01T04:00:00.000Z'),
      end: new Date('2026-11-03T05:00:00.000Z'),
      dayKeys: ['2026-11-01', '2026-11-02'],
    });
  });

  it('starts a date at the first valid local instant when midnight is skipped in Santiago', () => {
    expect(
      resolveReportingBoundary(
        { from: '2026-09-06', to: '2026-09-06', projectId: null, taskState: 'ALL', correctionState: 'ALL', page: 1 },
        'America/Santiago'
      )
    ).toEqual({
      start: new Date('2026-09-06T04:00:00.000Z'),
      end: new Date('2026-09-07T03:00:00.000Z'),
      dayKeys: ['2026-09-06'],
    });
  });

  it('ends the preceding Santiago date at the same skipped-midnight transition', () => {
    expect(
      resolveReportingBoundary(
        { from: '2026-09-05', to: '2026-09-05', projectId: null, taskState: 'ALL', correctionState: 'ALL', page: 1 },
        'America/Santiago'
      )
    ).toEqual({
      start: new Date('2026-09-05T04:00:00.000Z'),
      end: new Date('2026-09-06T04:00:00.000Z'),
      dayKeys: ['2026-09-05'],
    });
  });

  it('includes the last supported four-digit calendar date once', () => {
    expect(
      resolveReportingBoundary(
        { from: '9999-12-31', to: '9999-12-31', projectId: null, taskState: 'ALL', correctionState: 'ALL', page: 1 },
        'UTC'
      )
    ).toEqual({
      start: new Date('9999-12-31T00:00:00.000Z'),
      end: new Date('+010000-01-01T00:00:00.000Z'),
      dayKeys: ['9999-12-31'],
    });
  });
});
