import {
  buildProjectWorkspaceSearch,
  parseProjectWorkspaceQuery,
} from '@/schema/project-workspace';

describe('project workspace query state', () => {
  it('trims query text', () => {
    expect(parseProjectWorkspaceQuery({ query: '  prepare launch  ' })).toEqual({
      query: 'prepare launch',
      state: null,
      taskId: null,
    });
  });

  it('falls back to the default state for an invalid state', () => {
    expect(parseProjectWorkspaceQuery({ state: 'UNKNOWN' })).toEqual({
      query: '',
      state: null,
      taskId: null,
    });
  });

  it('removes a malformed selected task identifier', () => {
    expect(parseProjectWorkspaceQuery({ task: 'not-a-uuid' })).toEqual({
      query: '',
      state: null,
      taskId: null,
    });
  });

  it('omits default URL values when serializing', () => {
    expect(buildProjectWorkspaceSearch({ query: '', state: null, taskId: null }).toString()).toBe('');
    expect(
      buildProjectWorkspaceSearch({
        query: 'prepare launch',
        state: 'PAUSED',
        taskId: '11111111-1111-4111-8111-111111111111',
      }).toString()
    ).toBe('query=prepare+launch&state=PAUSED&task=11111111-1111-4111-8111-111111111111');
  });
});
