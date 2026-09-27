import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ProjectWorkspaceViewModel, TaskWorkspaceViewModel } from '@/server/projects/project-workspace-types';
import { renderToStaticMarkup } from 'react-dom/server';

import { taskWorkspaceCloseHref, TaskWorkspacePanel } from '@/components/task-workspace/TaskWorkspaceSheet';

jest.mock('next-safe-action/hooks', () => ({ useAction: jest.fn() }));
jest.mock('@/actions/task-workspace', () => ({ correctWorkSession: jest.fn(), mutateTaskWorkspace: jest.fn() }));
jest.mock('@/components/shared/Editor', () => ({
  __esModule: true,
  default: ({ defaultValue }: { defaultValue?: string }) => <div data-testid="rich-text-editor">{defaultValue}</div>,
}));

const selectedTask = (status: TaskWorkspaceViewModel['task']['status'] = 'IN_PROGRESS'): TaskWorkspaceViewModel => ({
  openSession:
    status === 'IN_PROGRESS'
      ? {
          correctedAt: null,
          correctionReason: null,
          endedAt: null,
          id: 'session-open',
          originalEndedAt: null,
          originalStartedAt: null,
          source: 'TIMER',
          startedAt: new Date('2026-09-21T11:00:00.000Z'),
        }
      : null,
  sessions: [],
  task: {
    createdAt: new Date('2026-09-20T08:00:00.000Z'),
    currentNextStep: 'Review the final layout',
    description: null,
    id: '11111111-1111-4111-8111-111111111111',
    openSessionStartedAt: status === 'IN_PROGRESS' ? new Date('2026-09-21T11:00:00.000Z') : null,
    planPosition: null,
    plannedMinutes: 30,
    projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    status,
    terminalAt: null,
    title: 'Build the task workspace',
    totalSeconds: 3_600,
    updatedAt: new Date('2026-09-21T12:00:00.000Z'),
  },
  workLog: [
    {
      content: 'Mapped the interaction states',
      createdAt: new Date('2026-09-21T09:00:00.000Z'),
      id: 'log-1',
      kind: 'PROGRESS',
      nextStepSnapshot: 'Build the markup',
      updatedAt: new Date('2026-09-21T09:00:00.000Z'),
    },
    {
      content: 'Built the markup',
      createdAt: new Date('2026-09-21T10:00:00.000Z'),
      id: 'log-2',
      kind: 'PROGRESS',
      nextStepSnapshot: null,
      updatedAt: new Date('2026-09-21T10:00:00.000Z'),
    },
  ],
});

const workspace = (overrides: Partial<ProjectWorkspaceViewModel> = {}): ProjectWorkspaceViewModel => ({
  backlog: [],
  history: [],
  project: { archived: false, archivedAt: null, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'My Progress' },
  query: { query: 'workspace', state: 'OPEN', taskId: '11111111-1111-4111-8111-111111111111' },
  runningTask: null,
  selectedTask: selectedTask(),
  summary: { cancelledCount: 0, completedCount: 0, openCount: 1, runningTaskId: null, trackedSeconds: 3_600 },
  today: [],
  ...overrides,
});

describe('Task workspace markup', () => {
  it('renders stored Lexical history and next steps as readable text', () => {
    const legacyValue = JSON.stringify({
      root: {
        children: [{ children: [{ text: 'Review the evidence', type: 'text' }], type: 'paragraph' }],
        type: 'root',
      },
    });
    const selected = selectedTask();
    selected.task.currentNextStep = legacyValue;
    selected.workLog[0].content = legacyValue;
    selected.workLog[0].nextStepSnapshot = legacyValue;

    const html = renderToStaticMarkup(
      <TaskWorkspacePanel
        correctionDrafts={{}}
        drafts={{ description: '', nextStep: 'Review the evidence', progress: '', progressNextStep: '' }}
        onCorrectionDraftChange={() => undefined}
        onCorrectSession={() => undefined}
        onDraftChange={() => undefined}
        onLogProgress={() => undefined}
        onTransition={() => undefined}
        onUpdateNextStep={() => undefined}
        pending={{}}
        workspace={workspace({ selectedTask: selected })}
      />
    );

    expect(html).toContain('Review the evidence');
    expect(html).not.toContain('&quot;root&quot;');
  });

  it('renders a descriptive task panel with project identity, state, and timer action', () => {
    const selected = selectedTask();
    selected.task.description = 'Define what success looks like';
    const html = renderToStaticMarkup(
      <TaskWorkspacePanel
        correctionDrafts={{}}
        drafts={{ description: 'Define what success looks like', nextStep: '', progress: '', progressNextStep: '' }}
        onCorrectionDraftChange={() => undefined}
        onCorrectSession={() => undefined}
        onDraftChange={() => undefined}
        onLogProgress={() => undefined}
        onTransition={() => undefined}
        onUpdateNextStep={() => undefined}
        pending={{}}
        workspace={workspace({ selectedTask: selected })}
      />
    );

    expect(html).toContain('Build the task workspace');
    expect(html).toContain('My Progress');
    expect(html).toContain('In progress');
    expect(html).toContain('Define what success looks like');
    expect(html).toContain('Task description');
    expect(html.indexOf('Task description')).toBeLessThan(html.indexOf('Current next step'));
    expect(html).toContain('Pause timer');
    expect(html).toContain('1h 0m tracked');
    expect(html.indexOf('Current next step')).toBeLessThan(html.indexOf('Log progress'));
    expect(html.indexOf('Log progress')).toBeLessThan(html.indexOf('>Progress</h3>'));
    expect(html.indexOf('>Progress</h3>')).toBeLessThan(html.indexOf('Session history'));
  });

  it('uses an ordered work ledger and keeps essential actions visible', () => {
    const html = renderToStaticMarkup(
      <TaskWorkspacePanel
        correctionDrafts={{}}
        drafts={{ description: '', nextStep: '', progress: '', progressNextStep: '' }}
        onCorrectionDraftChange={() => undefined}
        onCorrectSession={() => undefined}
        onDraftChange={() => undefined}
        onLogProgress={() => undefined}
        onTransition={() => undefined}
        onUpdateNextStep={() => undefined}
        pending={{}}
        workspace={workspace()}
      />
    );

    expect(html).toContain('<ol');
    expect(html.indexOf('Mapped the interaction states')).toBeLessThan(html.indexOf('Built the markup'));
    expect(html).toContain('Complete task');
    expect(html).toContain('Cancel task…');
    expect(html).not.toContain('group-hover');
  });

  it('switches archived workspaces to a visible read-only presentation', () => {
    const html = renderToStaticMarkup(
      <TaskWorkspacePanel
        correctionDrafts={{}}
        drafts={{ description: '', nextStep: '', progress: '', progressNextStep: '' }}
        onCorrectionDraftChange={() => undefined}
        onCorrectSession={() => undefined}
        onDraftChange={() => undefined}
        onLogProgress={() => undefined}
        onTransition={() => undefined}
        onUpdateNextStep={() => undefined}
        pending={{}}
        workspace={workspace({ project: { ...workspace().project, archived: true } })}
      />
    );

    expect(html).toContain('Archived project · Read-only');
    expect(html).toContain('Restore this project to make changes.');
    expect(html).not.toContain('Pause timer');
    expect(html).not.toContain('Cancel task…');
  });

  it('shows progress history and a done summary for a completed task without edit actions', () => {
    const selected = selectedTask('COMPLETED');
    selected.task.terminalAt = new Date('2026-09-21T12:30:00.000Z');
    selected.workLog.push({
      content: 'Delivered the final layout',
      createdAt: new Date('2026-09-21T12:30:00.000Z'),
      id: 'log-3',
      kind: 'COMPLETION_SUMMARY',
      nextStepSnapshot: null,
      updatedAt: new Date('2026-09-21T12:30:00.000Z'),
    });
    const html = renderToStaticMarkup(
      <TaskWorkspacePanel
        correctionDrafts={{}}
        drafts={{ description: '', nextStep: '', progress: '', progressNextStep: '' }}
        onCorrectionDraftChange={() => undefined}
        onCorrectSession={() => undefined}
        onDraftChange={() => undefined}
        onLogProgress={() => undefined}
        onTransition={() => undefined}
        onUpdateNextStep={() => undefined}
        pending={{}}
        workspace={workspace({ selectedTask: selected })}
      />
    );

    expect(html).toContain('>Progress</h3>');
    expect(html).toContain('Mapped the interaction states');
    expect(html).toContain('>Done</h3>');
    expect(html).toContain('Last next step');
    expect(html).not.toContain('Current next step');
    expect(html).toContain('Delivered the final layout');
    expect(html.match(/Delivered the final layout/g)).toHaveLength(1);
    expect(html).toContain('Completed on');
    expect(html).not.toContain('Save progress');
    expect(html).not.toContain('Complete task');
  });

  it('shows an honest empty progress state for completed work without logs', () => {
    const selected = selectedTask('COMPLETED');
    selected.workLog = [];
    const html = renderToStaticMarkup(
      <TaskWorkspacePanel
        correctionDrafts={{}}
        drafts={{ description: '', nextStep: '', progress: '', progressNextStep: '' }}
        onCorrectionDraftChange={() => undefined}
        onCorrectSession={() => undefined}
        onDraftChange={() => undefined}
        onLogProgress={() => undefined}
        onTransition={() => undefined}
        onUpdateNextStep={() => undefined}
        pending={{}}
        workspace={workspace({ selectedTask: selected })}
      />
    );
    expect(html).toContain('No progress has been logged yet.');
    expect(html).toContain('No completion summary was recorded.');
  });

  it('removes only task selection when closing', () => {
    expect(taskWorkspaceCloseHref(workspace())).toBe(
      '/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?query=workspace&amp;state=OPEN'.replace('&amp;', '&')
    );
  });

  it('associates progress and next-step failures with their controls', () => {
    const html = renderToStaticMarkup(
      <TaskWorkspacePanel
        composerExpanded
        correctionDrafts={{}}
        drafts={{ description: '', nextStep: 'Keep this', progress: 'Draft progress', progressNextStep: '' }}
        errorByField={{ nextStep: 'Could not save next step.', progress: 'Could not save progress.' }}
        onCorrectionDraftChange={() => undefined}
        onCorrectSession={() => undefined}
        onDraftChange={() => undefined}
        onLogProgress={() => undefined}
        onTransition={() => undefined}
        onUpdateNextStep={() => undefined}
        pending={{}}
        workspace={workspace()}
      />
    );

    expect(html).toContain('aria-describedby="task-next-step-error"');
    expect(html).toContain('id="task-next-step-error"');
    expect(html).toContain('aria-describedby="task-progress-error"');
    expect(html).toContain('id="task-progress-error"');
    expect(html).toContain('Draft progress');
    expect(html).toContain('data-testid="rich-text-editor"');
    expect(html).toContain('Keep this');
  });

  it('keeps narrow actions visible in a separate safe-area footer while the panel scrolls', () => {
    const sheetSource = readFileSync(
      resolve(process.cwd(), 'src/components/task-workspace/TaskWorkspaceSheet.tsx'),
      'utf8'
    );
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(sheetSource).toContain('showFinishActions={false}');
    expect(sheetSource).toContain('<TaskWorkspaceFinishActions');
    expect(sheetSource).toContain('className="task-workspace-sheet w-full sm:max-w-2xl"');
    expect(css).toMatch(/\.task-workspace-sheet\s*\{[^}]*overflow-hidden/);
    expect(css).toMatch(/\.task-workspace-panel\s*\{[^}]*overflow-y-auto/);
    expect(css).toMatch(/\.task-workspace-finish\s*\{[^}]*env\(safe-area-inset-bottom\)/);
  });
});
