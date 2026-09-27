import type { TaskStatus } from '../../../generated/prisma/client';
import { getUserPlanDate, normalizeExecutionState } from '../tasks/task-queries';
import type {
  ProjectWorkspaceQuery,
  ProjectWorkspaceQueryClient,
  ProjectWorkspaceTask,
  ProjectWorkspaceViewModel,
  TaskWorkspaceSession,
  TaskWorkspaceViewModel,
} from './project-workspace-types';

type GroupedProjectWorkspaceTasks = Pick<
  ProjectWorkspaceViewModel,
  'runningTask' | 'today' | 'backlog' | 'history'
>;

const isTerminal = (status: ProjectWorkspaceTask['status']): boolean =>
  status === 'COMPLETED' || status === 'CANCELLED';

const byId = (left: ProjectWorkspaceTask, right: ProjectWorkspaceTask): number => left.id.localeCompare(right.id);

const matchesQuery = (task: ProjectWorkspaceTask, query: ProjectWorkspaceQuery): boolean => {
  if (query.query && !task.title.toLocaleLowerCase().includes(query.query.toLocaleLowerCase())) return false;
  if (!query.state) return true;
  if (query.state === 'OPEN') return !isTerminal(task.status);
  return task.status === query.state;
};

export const groupProjectWorkspaceTasks = (
  tasks: ProjectWorkspaceTask[],
  query: ProjectWorkspaceQuery = { query: '', state: null, taskId: null }
): GroupedProjectWorkspaceTasks => {
  const visible = tasks.filter((task) => matchesQuery(task, query));
  const runningTask = visible
    .filter((task) => task.openSessionStartedAt !== null)
    .sort((left, right) => {
      const elapsed = right.openSessionStartedAt!.getTime() - left.openSessionStartedAt!.getTime();
      return elapsed || byId(left, right);
    })[0] ?? null;
  const runningTaskId = runningTask?.id;
  const history = visible
    .filter((task) => isTerminal(task.status))
    .sort((left, right) => {
      const terminalDifference = (right.terminalAt?.getTime() ?? -Infinity) - (left.terminalAt?.getTime() ?? -Infinity);
      return terminalDifference || byId(left, right);
    });
  const active = visible.filter((task) => !isTerminal(task.status) && task.id !== runningTaskId);
  const today = active
    .filter((task) => task.planPosition !== null)
    .sort((left, right) => (left.planPosition! - right.planPosition!) || byId(left, right));
  const todayTaskIds = new Set(today.map((task) => task.id));
  const backlog = active
    .filter((task) => !todayTaskIds.has(task.id))
    .sort((left, right) => (right.updatedAt.getTime() - left.updatedAt.getTime()) || byId(left, right));

  return { runningTask, today, backlog, history };
};

const closedSeconds = (sessions: Array<{ endedAt: Date | null; startedAt: Date }>): number =>
  sessions.reduce((total, session) => {
    if (!session.endedAt) return total;
    return total + Math.max(0, (session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
  }, 0);

const toSession = (session: {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  source: 'TIMER' | 'MIGRATED' | 'MANUAL_CORRECTION';
  originalStartedAt: Date | null;
  originalEndedAt: Date | null;
  correctionReason: string | null;
  correctedAt: Date | null;
}): TaskWorkspaceSession => ({ ...session });

const toTask = (
  task: {
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    currentNextStep: string | null;
    defaultPlannedMinutes: number | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    loggedTime: Array<{ endedAt: Date | null; startedAt: Date }>;
    dailyPlans: Array<{
      outcome: 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'CARRIED' | 'RETURNED_TO_BACKLOG';
      planDate: Date;
      plannedMinutes: number | null;
      position: number;
    }>;
  },
  planDateKey: string
): ProjectWorkspaceTask => {
  const openSession = task.loggedTime.find((session) => session.endedAt === null) ?? null;
  const todayPlan = task.dailyPlans.find(
    (plan) => plan.outcome === 'OPEN' && plan.planDate.toISOString().slice(0, 10) === planDateKey
  );

  return {
    createdAt: task.createdAt,
    description: task.description,
    currentNextStep: task.currentNextStep,
    id: task.id,
    openSessionStartedAt: openSession?.startedAt ?? null,
    planPosition: todayPlan?.position ?? null,
    plannedMinutes: todayPlan?.plannedMinutes ?? task.defaultPlannedMinutes,
    projectId: task.projectId,
    status: normalizeExecutionState(task.status),
    terminalAt: task.completedAt ?? task.cancelledAt,
    title: task.title,
    totalSeconds: closedSeconds(task.loggedTime),
    updatedAt: task.updatedAt,
  };
};

export const readProjectWorkspaceForOwner = async ({
  now = new Date(),
  ownerId,
  projectId,
  prisma,
  query,
}: {
  ownerId: string;
  projectId: string;
  query: ProjectWorkspaceQuery;
  now?: Date;
  prisma: ProjectWorkspaceQueryClient;
}): Promise<ProjectWorkspaceViewModel | null> => {
  const project = await prisma.project.findFirst({
    select: {
      archived: true,
      archivedAt: true,
      id: true,
      name: true,
      owner: { select: { timezone: true } },
      tasks: {
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: {
          cancelledAt: true,
          completedAt: true,
          createdAt: true,
          description: true,
          currentNextStep: true,
          dailyPlans: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: { outcome: true, planDate: true, plannedMinutes: true, position: true },
            where: { projectId, userId: ownerId },
          },
          defaultPlannedMinutes: true,
          id: true,
          loggedTime: {
            orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
            select: {
              correctedAt: true,
              correctionReason: true,
              endedAt: true,
              id: true,
              originalEndedAt: true,
              originalStartedAt: true,
              source: true,
              startedAt: true,
            },
            where: { projectId, userId: ownerId },
          },
          projectId: true,
          status: true,
          title: true,
          updatedAt: true,
          workLog: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { content: true, createdAt: true, id: true, kind: true, nextStepSnapshot: true, updatedAt: true },
            where: { projectId, userId: ownerId },
          },
        },
        where: { projectId, userId: ownerId },
      },
    },
    where: { id: projectId, ownerId },
  });
  if (!project) return null;

  const planDateKey = getUserPlanDate(now, project.owner.timezone).key;
  const tasks = project.tasks.map((task) => toTask(task, planDateKey));
  const selectedIndex = query.taskId ? project.tasks.findIndex((task) => task.id === query.taskId) : -1;
  if (query.taskId && selectedIndex === -1) return null;

  const selectedRow = selectedIndex === -1 ? null : project.tasks[selectedIndex];
  const selectedTask = selectedRow
    ? (() => {
        const task = tasks[selectedIndex];
        const sessions = selectedRow.loggedTime.map(toSession);
        return {
          openSession: sessions.find((session) => session.endedAt === null) ?? null,
          sessions,
          task,
          workLog: selectedRow.workLog,
        } satisfies TaskWorkspaceViewModel;
      })()
    : null;
  const allGrouped = groupProjectWorkspaceTasks(tasks);
  const grouped = groupProjectWorkspaceTasks(tasks, query);
  const normalizedStatuses = tasks.map((task) => task.status);

  return {
    ...grouped,
    project: { archived: project.archived, archivedAt: project.archivedAt, id: project.id, name: project.name },
    query,
    selectedTask,
    summary: {
      cancelledCount: normalizedStatuses.filter((status) => status === 'CANCELLED').length,
      completedCount: normalizedStatuses.filter((status) => status === 'COMPLETED').length,
      openCount: normalizedStatuses.filter((status) => !isTerminal(status)).length,
      runningTaskId: allGrouped.runningTask?.id ?? null,
      trackedSeconds: tasks.reduce((total, task) => total + task.totalSeconds, 0),
    },
  };
};
