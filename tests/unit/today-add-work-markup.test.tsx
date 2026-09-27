import { renderToStaticMarkup } from 'react-dom/server';

import {
  BacklogPicker,
  BacklogPickerPanel,
  filterTodayBacklog,
  settleBacklogQuery,
} from '@/components/today/BacklogPicker';
import {
  createInlineTaskDraft,
  InlineTaskFormFields,
  requestIdForSubmit,
  settleInlineTaskDraft,
} from '@/components/today/InlineTaskForm';
import type { TodayBacklogItem, TodayProjectIdentity } from '@/server/today/today-types';
import { createTodayTaskInputSchema } from '@/schema/today';
import { createTaskInputSchema, taskDetailsSchema } from '@/schema/task';

const backlog: TodayBacklogItem[] = [
  {
    actualSeconds: 0,
    createdAt: '2026-09-15T08:00:00.000Z',
    currentNextStep: null,
    defaultPlannedMinutes: 30,
    openSessionStartedAt: null,
    project: { id: 'project-1', name: 'Client work' },
    status: 'READY',
    taskId: 'task-1',
    title: 'Prepare launch notes',
  },
  {
    actualSeconds: 0,
    createdAt: '2026-09-15T09:00:00.000Z',
    currentNextStep: null,
    defaultPlannedMinutes: null,
    openSessionStartedAt: null,
    project: { id: 'project-2', name: 'Personal' },
    status: 'PAUSED',
    taskId: 'task-2',
    title: 'Book dentist',
  },
];

const projects: TodayProjectIdentity[] = [
  { id: 'project-1', name: 'Client work' },
  { id: 'project-2', name: 'Personal' },
];

describe('Today add-work flows', () => {
  it('accepts an optional trimmed description with a 20,000-character limit', () => {
    const input = { description: '  Clarify the scope  ', planDate: '2026-09-27', projectId: '10000000-0000-4000-8000-000000000101', requestId: '20000000-0000-4000-8000-000000000101', title: 'Plan release' };
    expect(createTodayTaskInputSchema.parse(input).description).toBe('Clarify the scope');
    expect(createTodayTaskInputSchema.safeParse({ ...input, description: 'x'.repeat(20_001) }).success).toBe(false);
  });

  it('accepts descriptions in the older create action without treating them as progress', () => {
    const parsed = createTaskInputSchema.parse({ description: '  Outline the release  ', startNow: true, title: 'Plan release' });
    expect(parsed.description).toBe('Outline the release');
    expect(parsed.progress).toBeUndefined();
  });

  it('accepts description edits in the older task details action', () => {
    const parsed = taskDetailsSchema.parse({ id: '20000000-0000-4000-8000-000000000101', description: '  Updated scope  ' });
    expect(parsed.description).toBe('Updated scope');
    expect(parsed.progress).toBeUndefined();
  });
  it('filters backlog by task or project and preserves deterministic source order', () => {
    expect(filterTodayBacklog(backlog, 'launch')).toEqual([backlog[0]]);
    expect(filterTodayBacklog(backlog, 'PERSONAL')).toEqual([backlog[1]]);
    expect(filterTodayBacklog(backlog, '   ')).toEqual(backlog);
  });

  it('renders searchable results with project identity and a useful no-results state', () => {
    const html = renderToStaticMarkup(
      <BacklogPickerPanel
        backlog={backlog}
        onAdd={() => undefined}
        pendingTaskId={null}
        query="launch"
        setQuery={() => undefined}
      />
    );

    expect(html).toContain('Search backlog');
    expect(html).toContain('Prepare launch notes');
    expect(html).toContain('Client work');
    expect(html).not.toContain('Book dentist');

    const emptyHtml = renderToStaticMarkup(
      <BacklogPickerPanel
        backlog={backlog}
        onAdd={() => undefined}
        pendingTaskId={null}
        query="missing"
        setQuery={() => undefined}
      />
    );
    expect(emptyHtml).toContain('No backlog tasks match');
  });

  it('keeps the backlog opener focusable when the final item has been added', () => {
    const html = renderToStaticMarkup(
      <BacklogPicker backlog={[]} onAdd={async () => ({ ok: true, preserveInput: false })} />
    );

    expect(html).toContain('Add from backlog');
    expect(html).not.toContain('disabled=""');

    const panel = renderToStaticMarkup(
      <BacklogPickerPanel backlog={[]} onAdd={() => undefined} pendingTaskId={null} query="" setQuery={() => undefined} />
    );
    expect(panel).toContain('No backlog tasks are available');
  });

  it('renders explicit project, title, planned-minutes, and start-now controls', () => {
    const html = renderToStaticMarkup(
      <InlineTaskFormFields
        draft={createInlineTaskDraft()}
        onChange={() => undefined}
        pending={false}
        projects={projects}
      />
    );

    expect(html).toContain('Project');
    expect(html).toContain('Choose a project');
    expect(html).toContain('Task title');
    expect(html).toContain('Task description');
    expect(html).toContain('id="today-create-description"');
    expect(html).toContain('Planned minutes');
    expect(html).toContain('min="1"');
    expect(html).toContain('max="1440"');
    expect(html).toContain('Start this task now');
    expect(html).toContain('required=""');
  });

  it('reuses a request id after failure and resets fields only after confirmed success', () => {
    const createId = jest.fn(() => 'request-1');
    expect(requestIdForSubmit(null, createId)).toBe('request-1');
    expect(requestIdForSubmit('request-1', createId)).toBe('request-1');
    expect(createId).toHaveBeenCalledTimes(1);

    const draft = {
      description: 'Why this work matters',
      plannedMinutes: '45',
      projectId: 'project-1',
      requestId: 'request-1',
      startNow: true,
      title: 'Keep this input',
    };
    const failed = settleInlineTaskDraft(draft, {
      error: { code: 'UNKNOWN', message: 'Offline', retryable: true },
      ok: false,
      preserveInput: true,
    });
    expect(failed).toEqual(draft);
    expect(settleBacklogQuery('launch', {
      error: { code: 'STALE', message: 'Newer result applied', retryable: true },
      ok: false,
      preserveInput: true,
      stale: true,
    })).toBe('launch');

    const succeeded = settleInlineTaskDraft(draft, { ok: true, preserveInput: false });
    expect(succeeded).toEqual(createInlineTaskDraft());
    expect(settleBacklogQuery('launch', { ok: true, preserveInput: false })).toBe('');
  });
});
