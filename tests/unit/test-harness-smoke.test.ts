import { assertTestDatabaseUrl } from '../helpers/database';
import { buildTwoUserFixture } from '../helpers/factories';

describe('focused TypeScript test harness', () => {
  it('rejects a database URL whose database name is not explicitly marked for tests', () => {
    expect(() => assertTestDatabaseUrl('postgresql://developer:secret@localhost:5432/my_progress')).toThrow(
      /test database/i
    );
  });

  it('builds two isolated user, project, task, and session ownership chains', () => {
    const fixture = buildTwoUserFixture();

    expect(fixture.users.secondary.id).not.toBe(fixture.users.primary.id);
    expect(fixture.users.primary.name).toBe('Primary User');
    expect(fixture.users.primary.password).toBe('test-password-hash');
    expect(fixture.projects.primary.ownerId).toBe(fixture.users.primary.id);
    expect(fixture.projects.secondary.ownerId).toBe(fixture.users.secondary.id);
    expect(fixture.tasks.primary.projectId).toBe(fixture.projects.primary.id);
    expect(fixture.tasks.secondary.projectId).toBe(fixture.projects.secondary.id);
    expect(fixture.tasks.primary.title).toBe('Primary task');
    expect(fixture.tasks.primary.status).toBe('IN_PROGRESS');
    expect(fixture.sessions.primary.taskId).toBe(fixture.tasks.primary.id);
    expect(fixture.sessions.secondary.taskId).toBe(fixture.tasks.secondary.id);
    expect(fixture.sessions.primary.from).toEqual(new Date('2026-01-05T09:00:00.000Z'));
  });
});
