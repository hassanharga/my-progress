'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import { useAction } from 'next-safe-action/hooks';

import { TaskStatus, type TaskListItem } from '@/types/task';
import { createTask, getTaskById, getTasksList, updateTask, updateTaskDetails } from '@/actions/task';

export type CreateTaskInput = Parameters<typeof createTask>[0];
export type UpdateTaskInput = Parameters<typeof updateTask>[0];
export type EditTaskInput = Parameters<typeof updateTaskDetails>[0];

interface TaskContextType {
  limit: number;
  tasks?: TaskListItem[];
  hasNextPage: boolean;
  nextCursor: string | null;
  hasPrevPage: boolean;
  isLoadingPage: boolean;
  openDrawer: boolean;
  taskData?: {
    duration: string;
    userId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    status: TaskStatus;
    progress: string | null;
    todo: string | null;
    totalSeconds: number;
  } | null;
  isExecutingCreateTask: boolean;
  isExecutingUpdateTask: boolean;
  isExecutingEditTask: boolean;
  editTask: (data: EditTaskInput) => Promise<boolean>;
  fetchNextPage: () => Promise<void>;
  fetchPrevPage: () => Promise<void>;
  executeGetTaskById: (input: { taskId: string }) => void;
  createTask: (data: CreateTaskInput) => Promise<void>;
  updateTask: (data: UpdateTaskInput) => Promise<void>;
  fetchTasks: () => Promise<void>;
  closeDrawer: () => void;
}

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
  editTask: async () => false,
  fetchNextPage: async () => {},
  fetchPrevPage: async () => {},
  executeGetTaskById: () => {},
  createTask: async () => {},
  updateTask: async () => {},
  closeDrawer: async () => {},
  fetchTasks: async () => {},
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
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage ?? false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor ?? null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);

  // ACTIONS
  // task list
  const { execute: executeList } = useAction(getTasksList, {
    onSuccess: ({ data }) => {
      if (data) {
        setTasks(data.tasks);
        setHasNextPage(data.hasNextPage);
        setNextCursor(data.nextCursor);
      }
    },
  });

  // get task by id
  const {
    execute: executeGetTaskById,
    result: { data: taskData },
    reset: resetGetTaskById,
  } = useAction(getTaskById, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setOpenDrawer(true);
    },
  });

  // create task
  const { executeAsync: executeCreateTask, isExecuting } = useAction(createTask);

  // update task
  const { executeAsync: executeUpdateTask, isExecuting: isExecutingUpdateTask } = useAction(updateTask);

  // edit task details
  const { executeAsync: executeEditTask, isExecuting: isExecutingEditTask } = useAction(updateTaskDetails);

  // HANDLERS

  // fetch tasks list (first page)
  const fetchTasks = async (): Promise<void> => {
    executeList({ limit, cursor: null });
  };

  // fetch next page using cursor
  const fetchNextPage = async (): Promise<void> => {
    if (!nextCursor) return;
    setIsLoadingPage(true);
    const newStack = [...cursorStack.slice(0, cursorIndex + 1), nextCursor];
    setCursorStack(newStack);
    setCursorIndex(cursorIndex + 1);
    executeList({ limit, cursor: nextCursor });
    setIsLoadingPage(false);
  };

  // fetch previous page using cursor stack
  const fetchPrevPage = async (): Promise<void> => {
    if (cursorIndex === 0) return;
    setIsLoadingPage(true);
    const newIndex = cursorIndex - 1;
    setCursorIndex(newIndex);
    executeList({ limit, cursor: cursorStack[newIndex] });
    setIsLoadingPage(false);
  };

  // create task handler
  const onStartTask = async ({ title, progress }: CreateTaskInput): Promise<void> => {
    if (!title?.trim()) return;
    await executeCreateTask({ title, progress });
    if (cursorIndex === 0) fetchTasks();
  };

  // update task handler
  const updateTaskHandler = async (data: UpdateTaskInput) => {
    if (!data?.id) return undefined;
    await executeUpdateTask(data);
    if (cursorIndex === 0) fetchTasks();
  };

  // edit task details handler
  const editTaskHandler = async (data: EditTaskInput): Promise<boolean> => {
    const result = await executeEditTask(data);
    if (!result || result.serverError) return false;
    if (cursorIndex === 0) fetchTasks();
    executeGetTaskById({ taskId: data.id });
    return true;
  };

  const closeDrawer = () => {
    setOpenDrawer(false);
    resetGetTaskById();
  };

  // HOOKS

  // close drawer on unmount
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
        isExecutingCreateTask: isExecuting,
        isExecutingUpdateTask,
        isExecutingEditTask,
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

  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }

  return context;
};

export default TaskProvider;
