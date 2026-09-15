'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { useAction } from 'next-safe-action/hooks';

import type { TaskListItem, TaskWithLoggedTime } from '@/types/task';
import { createTask, getTaskById, getTasksList, updateTask, updateTaskDetails } from '@/actions/task';
import { reconcilePagination, reconcileTaskMutation } from '@/contexts/task-reconciliation';

export type CreateTaskInput = Parameters<typeof createTask>[0];
export type UpdateTaskInput = Parameters<typeof updateTask>[0];
export type EditTaskInput = Parameters<typeof updateTaskDetails>[0];

export type ActionFeedback = {
  ok: boolean;
  error?: string;
  preserveInput: boolean;
};

interface TaskContextType {
  limit: number;
  tasks?: TaskListItem[];
  hasNextPage: boolean;
  nextCursor: string | null;
  hasPrevPage: boolean;
  isLoadingPage: boolean;
  openDrawer: boolean;
  taskData?: TaskWithLoggedTime;
  isExecutingCreateTask: boolean;
  isExecutingUpdateTask: boolean;
  isExecutingEditTask: boolean;
  pendingTaskIds: string[];
  isTaskPending: (taskId: string) => boolean;
  editTask: (data: EditTaskInput) => Promise<ActionFeedback>;
  fetchNextPage: () => Promise<ActionFeedback>;
  fetchPrevPage: () => Promise<ActionFeedback>;
  executeGetTaskById: (input: { taskId: string }) => void;
  createTask: (data: CreateTaskInput) => Promise<ActionFeedback>;
  updateTask: (data: UpdateTaskInput) => Promise<ActionFeedback>;
  fetchTasks: () => Promise<ActionFeedback>;
  closeDrawer: () => void;
}

const idleFeedback = (): ActionFeedback => ({ ok: false, preserveInput: true });

const TaskContext = createContext<TaskContextType>({
  limit: 4,
  tasks: [],
  hasNextPage: false,
  nextCursor: null,
  hasPrevPage: false,
  isLoadingPage: false,
  openDrawer: false,
  isExecutingCreateTask: false,
  isExecutingUpdateTask: false,
  isExecutingEditTask: false,
  pendingTaskIds: [],
  isTaskPending: () => false,
  editTask: async () => idleFeedback(),
  fetchNextPage: async () => idleFeedback(),
  fetchPrevPage: async () => idleFeedback(),
  executeGetTaskById: () => {},
  createTask: async () => idleFeedback(),
  updateTask: async () => idleFeedback(),
  closeDrawer: () => {},
  fetchTasks: async () => idleFeedback(),
});

const TaskProvider = ({
  children,
  initialTasks,
  initialHasNextPage,
  initialNextCursor,
}: {
  children: ReactNode;
  initialTasks?: TaskContextType['tasks'];
  initialHasNextPage?: boolean;
  initialNextCursor?: string | null;
}): JSX.Element => {
  const limit = useMemo(() => 4, []);
  const [tasks, setTasks] = useState(initialTasks);
  const tasksRef = useRef(tasks ?? []);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor ?? null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<string[]>([]);
  const mutationVersions = useRef<Record<string, number>>({});
  const paginationVersion = useRef(0);

  const setTaskItems = (items: TaskListItem[]): void => {
    tasksRef.current = items;
    setTasks(items);
  };

  const { executeAsync: executeList } = useAction(getTasksList);

  const {
    execute: executeGetTaskById,
    result: { data: taskData },
    reset: resetGetTaskById,
  } = useAction(getTaskById, {
    onSuccess: ({ data }) => {
      if (data) setOpenDrawer(true);
    },
  });

  const { executeAsync: executeCreateTask, isExecuting: isExecutingCreateTask } = useAction(createTask);
  const { executeAsync: executeUpdateTask, isExecuting: isExecutingUpdateTask } = useAction(updateTask);
  const { executeAsync: executeEditTask, isExecuting: isExecutingEditTask } = useAction(updateTaskDetails);

  const loadPage = async (cursor: string | null): Promise<ActionFeedback> => {
    const responseVersion = paginationVersion.current + 1;
    paginationVersion.current = responseVersion;
    setIsLoadingPage(true);
    const response = await executeList({ cursor, limit });
    const settlement = reconcilePagination({
      current: {
        hasNextPage,
        isLoading: true,
        nextCursor,
        tasks: tasksRef.current,
      },
      latestVersion: paginationVersion.current,
      response,
      responseVersion,
    });
    if (settlement.stale) return idleFeedback();

    setIsLoadingPage(false);
    if (settlement.error) return { error: settlement.error, ok: false, preserveInput: true };
    setTaskItems(settlement.tasks);
    setHasNextPage(settlement.hasNextPage);
    setNextCursor(settlement.nextCursor);
    return { ok: true, preserveInput: false };
  };

  const fetchTasks = async (): Promise<ActionFeedback> => loadPage(cursorStack[cursorIndex] ?? null);

  const fetchNextPage = async (): Promise<ActionFeedback> => {
    if (!nextCursor) return idleFeedback();
    const requestedCursor = nextCursor;
    const result = await loadPage(requestedCursor);
    if (!result.ok) return result;
    const newStack = [...cursorStack.slice(0, cursorIndex + 1), requestedCursor];
    setCursorStack(newStack);
    setCursorIndex(cursorIndex + 1);
    return result;
  };

  const fetchPrevPage = async (): Promise<ActionFeedback> => {
    if (cursorIndex === 0) return idleFeedback();
    const newIndex = cursorIndex - 1;
    const result = await loadPage(cursorStack[newIndex]);
    if (!result.ok) return result;
    setCursorIndex(newIndex);
    return result;
  };

  const settleMutation = async (
    operationKey: string,
    execute: () => ReturnType<typeof executeCreateTask>
  ): Promise<ActionFeedback> => {
    const responseVersion = (mutationVersions.current[operationKey] ?? 0) + 1;
    mutationVersions.current[operationKey] = responseVersion;
    if (operationKey !== 'create') setPendingTaskIds((current) => [...new Set([...current, operationKey])]);

    const response = await execute();
    const settlement = reconcileTaskMutation({
      latestVersion: mutationVersions.current[operationKey],
      response,
      responseVersion,
      tasks: tasksRef.current,
    });
    if (settlement.stale) return idleFeedback();

    if (operationKey !== 'create') {
      setPendingTaskIds((current) => current.filter((taskId) => taskId !== operationKey));
    }
    setTaskItems(settlement.tasks);
    return {
      error: settlement.error,
      ok: settlement.confirmedSuccess,
      preserveInput: settlement.preserveInput,
    };
  };

  const onStartTask = async (data: CreateTaskInput): Promise<ActionFeedback> => {
    if (!data.title?.trim()) return { error: 'Enter a task title.', ok: false, preserveInput: true };
    const result = await settleMutation('create', () =>
      executeCreateTask({ ...data, startNow: data.startNow ?? true })
    );
    if (result.ok && cursorIndex === 0) await fetchTasks();
    return result;
  };

  const updateTaskHandler = async (data: UpdateTaskInput): Promise<ActionFeedback> => {
    if (!data?.taskId) return { error: 'Choose a task to update.', ok: false, preserveInput: true };
    const result = await settleMutation(data.taskId, () => executeUpdateTask(data));
    if (result.ok && cursorIndex === 0) await fetchTasks();
    if (result.ok && openDrawer) executeGetTaskById({ taskId: data.taskId });
    return result;
  };

  const editTaskHandler = async (data: EditTaskInput): Promise<ActionFeedback> => {
    const response = await executeEditTask(data);
    if (response?.serverError) return { error: response.serverError, ok: false, preserveInput: true };
    if (response?.validationErrors) {
      return { error: 'Check the task details and try again.', ok: false, preserveInput: true };
    }
    if (!response?.data?.ok) {
      return {
        error: response?.data?.error?.message ?? 'The task did not return a result.',
        ok: false,
        preserveInput: true,
      };
    }
    if (cursorIndex === 0) await fetchTasks();
    executeGetTaskById({ taskId: data.id });
    return { ok: true, preserveInput: false };
  };

  const closeDrawer = () => {
    setOpenDrawer(false);
    resetGetTaskById();
  };

  useEffect(() => {
    return () => {
      setOpenDrawer(false);
    };
  }, []);

  return (
    <TaskContext.Provider
      value={{
        limit,
        openDrawer,
        tasks,
        hasNextPage,
        nextCursor,
        hasPrevPage: cursorIndex > 0,
        isLoadingPage,
        taskData,
        isExecutingCreateTask,
        isExecutingUpdateTask,
        isExecutingEditTask,
        pendingTaskIds,
        isTaskPending: (taskId) => pendingTaskIds.includes(taskId),
        editTask: editTaskHandler,
        closeDrawer,
        fetchNextPage,
        fetchPrevPage,
        executeGetTaskById,
        createTask: onStartTask,
        updateTask: updateTaskHandler,
        fetchTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (context === undefined) throw new Error('useTaskContext must be used within a TaskProvider');
  return context;
};

export default TaskProvider;
