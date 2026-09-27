import { groupProjectWorkspaceTasks } from '@/server/projects/read-project-workspace';
import type { ProjectWorkspaceTask } from '@/server/projects/project-workspace-types';

const task = (overrides: Partial<ProjectWorkspaceTask>): ProjectWorkspaceTask => ({
  createdAt: new Date('2026-09-20T08:00:00.000Z'),
  currentNextStep: null,
  description: null,
  id: '00000000-0000-4000-8000-000000000001',
  openSessionStartedAt: null,
  planPosition: null,
  plannedMinutes: null,
  projectId: '10000000-0000-4000-8000-000000000001',
  status: 'READY',
  terminalAt: null,
  title: 'Task',
  totalSeconds: 0,
  updatedAt: new Date('2026-09-20T08:00:00.000Z'),
  ...overrides,
});

describe('project workspace task grouping', () => {
  it('keeps the runner separate and orders Today, backlog, and history deterministically', () => {
    const grouped = groupProjectWorkspaceTasks([
      task({
        id: '00000000-0000-4000-8000-000000000010',
        openSessionStartedAt: new Date('2026-09-20T09:00:00.000Z'),
        status: 'IN_PROGRESS',
        title: 'Running',
      }),
      task({ id: '00000000-0000-4000-8000-000000000011', planPosition: 3, title: 'Today later' }),
      task({ id: '00000000-0000-4000-8000-000000000012', planPosition: 1, title: 'Today first' }),
      task({
        id: '00000000-0000-4000-8000-000000000014',
        title: 'Backlog tie second',
        updatedAt: new Date('2026-09-20T10:00:00.000Z'),
      }),
      task({
        id: '00000000-0000-4000-8000-000000000013',
        title: 'Backlog newest',
        updatedAt: new Date('2026-09-20T11:00:00.000Z'),
      }),
      task({
        id: '00000000-0000-4000-8000-000000000015',
        status: 'COMPLETED',
        terminalAt: new Date('2026-09-20T12:00:00.000Z'),
        title: 'History tie second',
      }),
      task({
        id: '00000000-0000-4000-8000-000000000016',
        status: 'CANCELLED',
        terminalAt: new Date('2026-09-20T12:00:00.000Z'),
        title: 'History tie third',
      }),
      task({
        id: '00000000-0000-4000-8000-000000000017',
        status: 'COMPLETED',
        terminalAt: new Date('2026-09-20T13:00:00.000Z'),
        title: 'History newest',
      }),
    ]);

    expect(grouped.runningTask?.title).toBe('Running');
    expect(grouped.today.map(({ title }) => title)).toEqual(['Today first', 'Today later']);
    expect(grouped.backlog.map(({ title }) => title)).toEqual(['Backlog newest', 'Backlog tie second']);
    expect(grouped.history.map(({ title }) => title)).toEqual([
      'History newest',
      'History tie second',
      'History tie third',
    ]);
  });
});
