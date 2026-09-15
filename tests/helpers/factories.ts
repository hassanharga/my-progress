type UserFixture = {
  id: string;
  email: string;
  name: string;
  password: string;
};

type ProjectFixture = {
  id: string;
  name: string;
  ownerId: string;
};

type TaskFixture = {
  id: string;
  projectId: string;
  status: 'IN_PROGRESS';
  title: string;
  userId: string;
};

type SessionFixture = {
  from: Date;
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
};

const displayLabel = (label: string): string => `${label.charAt(0).toUpperCase()}${label.slice(1)}`;

export const buildUserFixture = (label: string, overrides: Partial<UserFixture> = {}): UserFixture => ({
  id: `user-${label}`,
  email: `${label}@example.test`,
  name: `${displayLabel(label)} User`,
  password: 'test-password-hash',
  ...overrides,
});

export const buildProjectFixture = (
  label: string,
  ownerId: string,
  overrides: Partial<ProjectFixture> = {}
): ProjectFixture => ({
  id: `project-${label}`,
  name: `${label} project`,
  ownerId,
  ...overrides,
});

export const buildTaskFixture = (
  label: string,
  userId: string,
  projectId: string,
  overrides: Partial<TaskFixture> = {}
): TaskFixture => ({
  id: `task-${label}`,
  projectId,
  status: 'IN_PROGRESS',
  title: `${displayLabel(label)} task`,
  userId,
  ...overrides,
});

export const buildSessionFixture = (
  label: string,
  userId: string,
  projectId: string,
  taskId: string,
  overrides: Partial<SessionFixture> = {}
): SessionFixture => ({
  from: new Date('2026-01-05T09:00:00.000Z'),
  id: `session-${label}`,
  projectId,
  taskId,
  userId,
  ...overrides,
});

const buildOwnershipChain = (label: 'primary' | 'secondary') => {
  const user = buildUserFixture(label);
  const project = buildProjectFixture(label, user.id);
  const task = buildTaskFixture(label, user.id, project.id);
  const session = buildSessionFixture(label, user.id, project.id, task.id);

  return { project, session, task, user };
};

export const buildTwoUserFixture = () => {
  const primary = buildOwnershipChain('primary');
  const secondary = buildOwnershipChain('secondary');

  return {
    projects: { primary: primary.project, secondary: secondary.project },
    sessions: { primary: primary.session, secondary: secondary.session },
    tasks: { primary: primary.task, secondary: secondary.task },
    users: { primary: primary.user, secondary: secondary.user },
  };
};
