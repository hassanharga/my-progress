import { getProjectSwitcherView, THEME_OPTIONS } from '@/components/dashboard/top-bar-model';

describe('top bar model', () => {
  it.each([
    [{ phase: 'loading', activeName: null, projectCount: 0 }, { label: 'Loading projects', busy: true, canRetry: false }],
    [{ phase: 'load-error', activeName: 'Personal', projectCount: 2 }, { label: 'Personal', busy: false, canRetry: true }],
    [{ phase: 'switch-error', activeName: 'Personal', projectCount: 2 }, { label: 'Personal', busy: false, canRetry: false }],
    [{ phase: 'idle', activeName: null, projectCount: 0 }, { label: 'Create a project', busy: false, canRetry: false }],
    [{ phase: 'switching', activeName: 'Personal', projectCount: 2 }, { label: 'Personal', busy: true, canRetry: false }],
  ] as const)('derives an explicit project state', (input, expected) => {
    expect(getProjectSwitcherView(input)).toMatchObject(expected);
  });

  it('defines exactly the supported theme choices', () => {
    expect(THEME_OPTIONS.map(({ value }) => value)).toEqual(['light', 'dark', 'system']);
  });
});
