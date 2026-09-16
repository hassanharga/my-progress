import { getWorkloadPresentation } from '@/components/today/TodayHeader';
import type { TodayWorkload } from '@/server/today/today-types';

const workload = (overrides: Partial<TodayWorkload>): TodayWorkload => ({
  actualSeconds: 2_700,
  capacityMinutes: 480,
  plannedMinutes: 180,
  remainingMinutes: 300,
  state: 'under',
  utilizationPercent: 38,
  ...overrides,
});

describe('getWorkloadPresentation', () => {
  it.each([
    {
      expected: {
        label: '3h planned · No daily capacity set',
        tone: 'neutral',
        warning: null,
      },
      input: workload({ capacityMinutes: null, remainingMinutes: null, state: 'unset', utilizationPercent: null }),
    },
    {
      expected: {
        label: '3h planned of 8h · 5h remaining',
        tone: 'neutral',
        warning: null,
      },
      input: workload({}),
    },
    {
      expected: {
        label: '7h 30m planned of 8h · 30m remaining',
        tone: 'warning',
        warning: null,
      },
      input: workload({ plannedMinutes: 450, remainingMinutes: 30, state: 'near', utilizationPercent: 94 }),
    },
    {
      expected: {
        label: '9h planned of 8h · 1h over capacity',
        tone: 'danger',
        warning: 'Your plan is 1h over capacity. You can still keep every task.',
      },
      input: workload({ plannedMinutes: 540, remainingMinutes: -60, state: 'over', utilizationPercent: 113 }),
    },
  ])('returns numeric, non-blocking copy for $input.state capacity', ({ expected, input }) => {
    expect(getWorkloadPresentation(input)).toEqual(expected);
  });
});
