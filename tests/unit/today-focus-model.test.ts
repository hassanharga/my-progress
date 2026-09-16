import { getRunwayModel } from '@/components/today/TimeRunway';

describe('getRunwayModel', () => {
  it.each([
    {
      expected: { label: 'Ready', percent: 0, phase: 'ready', remainingText: '30m planned' },
      input: { elapsedSeconds: 0, plannedMinutes: 30, status: 'READY' as const },
    },
    {
      expected: { label: 'In progress', percent: 50, phase: 'active', remainingText: '15m remaining · 15m elapsed' },
      input: { elapsedSeconds: 900, plannedMinutes: 30, status: 'IN_PROGRESS' as const },
    },
    {
      expected: { label: 'Paused', percent: 25, phase: 'paused', remainingText: '23m remaining · 8m elapsed' },
      input: { elapsedSeconds: 450, plannedMinutes: 30, status: 'PAUSED' as const },
    },
    {
      expected: { label: 'Complete', percent: 83, phase: 'complete', remainingText: 'Completed in 25m · 30m planned' },
      input: { elapsedSeconds: 1500, plannedMinutes: 30, status: 'COMPLETED' as const },
    },
    {
      expected: { label: 'Over plan', percent: 100, phase: 'overrun', remainingText: '10m over · 40m elapsed' },
      input: { elapsedSeconds: 2400, plannedMinutes: 30, status: 'IN_PROGRESS' as const },
    },
    {
      expected: { label: 'No estimate', percent: 0, phase: 'unplanned', remainingText: 'Unplanned · 12m elapsed' },
      input: { elapsedSeconds: 720, plannedMinutes: 0, status: 'IN_PROGRESS' as const },
    },
    {
      expected: { label: 'Complete', percent: 0, phase: 'complete', remainingText: 'Completed in 12m · no estimate' },
      input: { elapsedSeconds: 720, plannedMinutes: null, status: 'COMPLETED' as const },
    },
    {
      expected: { label: 'Cancelled', percent: 0, phase: 'cancelled', remainingText: 'Stopped at 12m · no estimate' },
      input: { elapsedSeconds: 720, plannedMinutes: 0, status: 'CANCELLED' as const },
    },
  ])('returns an honest $expected.phase runway model', ({ expected, input }) => {
    expect(getRunwayModel(input)).toEqual(expected);
  });

  it('visually clamps an overrun while preserving its numeric overrun in text', () => {
    const model = getRunwayModel({ elapsedSeconds: 7_200, plannedMinutes: 30, status: 'IN_PROGRESS' });

    expect(model.percent).toBe(100);
    expect(model.remainingText).toBe('1h 30m over · 2h elapsed');
  });
});
