import type { ProjectWorkspaceViewModel } from '@/server/projects/project-workspace-types';
import { renderToStaticMarkup } from 'react-dom/server';

import { DashboardShellFrame } from '@/components/dashboard/DashboardShell';
import { buildProjectWorkspaceHref } from '@/components/project-workspace/project-workspace-url';
import { ProjectsIndex } from '@/components/project-workspace/ProjectsIndex';
import { ProjectWorkspace } from '@/components/project-workspace/ProjectWorkspace';

jest.mock('next-safe-action/hooks', () => ({ useAction: () => ({ execute: jest.fn(), isPending: false }) }));
jest.mock('@/actions/project', () => ({
  archiveProject: jest.fn(),
  createProject: jest.fn(),
  getProjects: jest.fn(),
  renameProject: jest.fn(),
  unarchiveProject: jest.fn(),
}));
jest.mock('@/actions/task-workspace', () => ({ correctWorkSession: jest.fn(), mutateTaskWorkspace: jest.fn() }));
jest.mock('@/components/dashboard/DashboardTopBar', () => () => null);

const task = (overrides: Partial<ProjectWorkspaceViewModel['backlog'][number]> = {}) => ({
  createdAt: new Date('2026-09-15T08:00:00.000Z'),
  currentNextStep: 'Review the acceptance criteria',
  id: '11111111-1111-4111-8111-111111111111',
  openSessionStartedAt: null,
  planPosition: null,
  plannedMinutes: 30,
  projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  status: 'READY' as const,
  terminalAt: null,
  title: 'Shape the project workspace',
  totalSeconds: 3_600,
  updatedAt: new Date('2026-09-15T09:00:00.000Z'),
  ...overrides,
});

const workspace = (overrides: Partial<ProjectWorkspaceViewModel> = {}): ProjectWorkspaceViewModel => ({
  backlog: [task()],
  history: [
    task({
      id: '22222222-2222-4222-8222-222222222222',
      status: 'COMPLETED',
      terminalAt: new Date('2026-09-14T09:00:00.000Z'),
      title: 'Define the project brief',
    }),
  ],
  project: {
    archived: false,
    archivedAt: null,
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'My Progress',
  },
  query: { query: '', state: null, taskId: null },
  runningTask: task({
    id: '33333333-3333-4333-8333-333333333333',
    openSessionStartedAt: new Date('2026-09-15T08:30:00.000Z'),
    status: 'IN_PROGRESS',
    title: 'Build the ledger view',
  }),
  selectedTask: null,
  summary: {
    cancelledCount: 0,
    completedCount: 1,
    openCount: 3,
    runningTaskId: '33333333-3333-4333-8333-333333333333',
    trackedSeconds: 7_200,
  },
  today: [task({ id: '44444444-4444-4444-8444-444444444444', planPosition: 0, title: 'Polish responsive states' })],
  ...overrides,
});

describe('Project workspace markup', () => {
  it('keeps one main landmark inside the shared shell on both project routes', () => {
    const projectHtml = renderToStaticMarkup(
      <DashboardShellFrame pathname="/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" topBar={<div>Toolbar</div>}>
        <ProjectWorkspace initialWorkspace={workspace()} />
      </DashboardShellFrame>
    );
    const indexHtml = renderToStaticMarkup(
      <DashboardShellFrame pathname="/projects" topBar={<div>Toolbar</div>}>
        <ProjectsIndex projects={[]} />
      </DashboardShellFrame>
    );

    expect(projectHtml.match(/<main\b/g)).toHaveLength(1);
    expect(indexHtml.match(/<main\b/g)).toHaveLength(1);
  });

  it('renders the approved hierarchy as a semantic working ledger', () => {
    const html = renderToStaticMarkup(<ProjectWorkspace initialWorkspace={workspace()} />);

    expect(html).toContain('<h1');
    for (const heading of ['Running now', 'Today', 'Backlog', 'Completed and cancelled']) {
      expect(html).toContain(`>${heading}</h2>`);
    }
    expect(html.indexOf('Running now')).toBeLessThan(html.indexOf('Today'));
    expect(html.indexOf('Today')).toBeLessThan(html.indexOf('Backlog'));
    expect(html.indexOf('Backlog')).toBeLessThan(html.indexOf('Completed and cancelled'));
    expect(html).toContain('aria-label="Project summary"');
  });

  it('keeps search, every state filter, and task-opening actions visible', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspace
        initialWorkspace={workspace({
          query: {
            query: '',
            state: null,
            taskId: '11111111-1111-4111-8111-111111111111',
          },
        })}
      />
    );

    expect(html).toContain('Search tasks');
    for (const label of ['All tasks', 'Open', 'Ready', 'In progress', 'Paused', 'Completed', 'Cancelled']) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).toContain('Open Shape the project workspace');
    expect(html).toContain('type="hidden" name="task" value="11111111-1111-4111-8111-111111111111"');
    expect(html).not.toContain('class="hidden"');
  });

  it('gives every empty region an explicit next action or explanation', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspace initialWorkspace={workspace({ backlog: [], history: [], runningTask: null, today: [] })} />
    );

    expect(html).toContain('No task is running. Start with Today or choose one from the backlog.');
    expect(html).toContain('Nothing is planned for Today. Choose a backlog task when you are ready.');
    expect(html).toContain('No backlog tasks match these filters. Clear or adjust the filters.');
    expect(html).toContain('Completed and cancelled tasks will stay here as project history.');
  });

  it('announces archived workspaces as readable and read-only without relying on color', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspace
        initialWorkspace={workspace({
          project: { ...workspace().project, archived: true, archivedAt: new Date('2026-09-16T10:00:00.000Z') },
        })}
      />
    );

    expect(html).toContain('Archived project');
    expect(html).toContain('Read-only');
    expect(html).toContain('Editing is disabled until this project is restored.');
  });

  it('preserves valid URL state, omits defaults, and safely replaces task selection', () => {
    expect(
      buildProjectWorkspaceHref('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
        current: { query: 'ledger', state: 'PAUSED', taskId: null },
        update: { taskId: '11111111-1111-4111-8111-111111111111' },
      })
    ).toBe(
      '/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?query=ledger&state=PAUSED&task=11111111-1111-4111-8111-111111111111'
    );
    expect(
      buildProjectWorkspaceHref('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
        current: { query: 'ledger', state: 'PAUSED', taskId: '11111111-1111-4111-8111-111111111111' },
        update: { query: '', state: null, taskId: null },
      })
    ).toBe('/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });

  it('renders owner-scoped active and archived choices with create and restore workflows', () => {
    const html = renderToStaticMarkup(
      <ProjectsIndex
        projects={[
          { archived: false, archivedAt: null, id: 'p1', name: 'Active project', taskCount: 2 },
          {
            archived: true,
            archivedAt: new Date('2026-09-10T00:00:00.000Z'),
            id: 'p2',
            name: 'Archived project',
            taskCount: 4,
          },
        ]}
      />
    );

    expect(html).toContain('Choose a project');
    expect(html).toContain('Active project');
    expect(html).toContain('Archived project');
    expect(html).toContain('Create or restore projects');
  });
});
