import { correctWorkSessionInputSchema } from '@/schema/task-workspace';
import { halfOpenIntervalsOverlap } from '@/server/tasks/correct-work-session';

const PROJECT_ID = '10000000-0000-4000-8000-000000000301';
const TASK_ID = '20000000-0000-4000-8000-000000000301';
const SESSION_ID = '30000000-0000-4000-8000-000000000301';

const correction = (overrides: Record<string, string> = {}) => ({
  endedAt: '2026-09-22T10:30:00.000Z',
  projectId: PROJECT_ID,
  reason: '  Corrected from calendar notes  ',
  sessionId: SESSION_ID,
  startedAt: '2026-09-22T10:00:00.000Z',
  taskId: TASK_ID,
  ...overrides,
});

describe('closed-session correction', () => {
  it('requires strict ISO instants for both endpoints', () => {
    expect(correctWorkSessionInputSchema.safeParse(correction({ startedAt: '2026-09-22 10:00:00' })).success).toBe(
      false
    );
    expect(correctWorkSessionInputSchema.safeParse(correction({ endedAt: '2026-09-22T10:30:00' })).success).toBe(false);
  });

  it('trims a required correction reason', () => {
    expect(correctWorkSessionInputSchema.parse(correction()).reason).toBe('Corrected from calendar notes');
    expect(correctWorkSessionInputSchema.safeParse(correction({ reason: '   ' })).success).toBe(false);
  });

  it.each(['projectId', 'taskId', 'sessionId'])('rejects a malformed %s', (key) => {
    expect(correctWorkSessionInputSchema.safeParse(correction({ [key]: 'not-a-uuid' })).success).toBe(false);
  });

  it('rejects an interval whose end precedes its start', () => {
    expect(correctWorkSessionInputSchema.safeParse(correction({ endedAt: '2026-09-22T09:59:59.999Z' })).success).toBe(
      false
    );
  });

  it('accepts an interval with equal endpoints', () => {
    expect(correctWorkSessionInputSchema.safeParse(correction({ endedAt: '2026-09-22T10:00:00.000Z' })).success).toBe(
      true
    );
  });

  it('treats boundary-touching half-open intervals as non-overlapping', () => {
    expect(
      halfOpenIntervalsOverlap(
        { startedAt: new Date('2026-09-22T10:00:00.000Z'), endedAt: new Date('2026-09-22T10:30:00.000Z') },
        { startedAt: new Date('2026-09-22T10:30:00.000Z'), endedAt: new Date('2026-09-22T11:00:00.000Z') }
      )
    ).toBe(false);
  });

  it('detects a positive intersection between half-open intervals', () => {
    expect(
      halfOpenIntervalsOverlap(
        { startedAt: new Date('2026-09-22T10:00:00.000Z'), endedAt: new Date('2026-09-22T10:30:00.000Z') },
        { startedAt: new Date('2026-09-22T10:29:59.999Z'), endedAt: new Date('2026-09-22T11:00:00.000Z') }
      )
    ).toBe(true);
  });

  it('does not treat an empty interval as overlapping', () => {
    expect(
      halfOpenIntervalsOverlap(
        { startedAt: new Date('2026-09-22T10:15:00.000Z'), endedAt: new Date('2026-09-22T10:15:00.000Z') },
        { startedAt: new Date('2026-09-22T10:00:00.000Z'), endedAt: new Date('2026-09-22T10:30:00.000Z') }
      )
    ).toBe(false);
  });
});
