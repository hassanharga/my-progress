import { taskWorkspaceMutationSchema } from '@/schema/task-workspace';

const PROJECT_ID = '10000000-0000-4000-8000-000000000101';
const TASK_ID = '20000000-0000-4000-8000-000000000101';

describe('task workspace mutation schema', () => {
  it('rejects empty and oversized progress content', () => {
    expect(
      taskWorkspaceMutationSchema.safeParse({
        content: '   ',
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        type: 'LOG_PROGRESS',
      }).success
    ).toBe(false);
    expect(
      taskWorkspaceMutationSchema.safeParse({
        content: JSON.stringify({ root: { children: [], type: 'root' } }),
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        type: 'LOG_PROGRESS',
      }).success
    ).toBe(false);
    expect(
      taskWorkspaceMutationSchema.safeParse({
        content: 'x'.repeat(20_001),
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        type: 'LOG_PROGRESS',
      }).success
    ).toBe(false);
  });

  it('trims submitted progress content', () => {
    const parsed = taskWorkspaceMutationSchema.parse({
      content: '  Finished the database check  ',
      projectId: PROJECT_ID,
      taskId: TASK_ID,
      type: 'LOG_PROGRESS',
    });

    expect(parsed).toMatchObject({ content: 'Finished the database check' });
  });

  it('accepts a next-step-only mutation without a progress field', () => {
    const parsed = taskWorkspaceMutationSchema.parse({
      nextStep: '  Review the ledger  ',
      projectId: PROJECT_ID,
      taskId: TASK_ID,
      type: 'UPDATE_NEXT_STEP',
    });

    expect(parsed).toEqual({
      nextStep: 'Review the ledger',
      projectId: PROJECT_ID,
      taskId: TASK_ID,
      type: 'UPDATE_NEXT_STEP',
    });
  });

  it('rejects malformed project and task identifiers', () => {
    expect(
      taskWorkspaceMutationSchema.safeParse({
        content: 'Progress',
        projectId: 'project-id',
        taskId: TASK_ID,
        type: 'LOG_PROGRESS',
      }).success
    ).toBe(false);
    expect(
      taskWorkspaceMutationSchema.safeParse({
        content: 'Progress',
        projectId: PROJECT_ID,
        taskId: 'task-id',
        type: 'LOG_PROGRESS',
      }).success
    ).toBe(false);
  });

  it.each(['START', 'PAUSE', 'COMPLETE', 'CANCEL'])('accepts the canonical %s transition event', (event) => {
    expect(
      taskWorkspaceMutationSchema.safeParse({
        projectId: PROJECT_ID,
        transition: { event, taskId: TASK_ID },
        type: 'TRANSITION',
      }).success
    ).toBe(true);
  });
});
