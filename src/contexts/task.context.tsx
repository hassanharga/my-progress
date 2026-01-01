'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useAction } from 'next-safe-action/hooks';

import { TaskStatus } from '@/types/task';
import { createTask, getTaskById, getTasksList, updateTask } from '@/actions/task';

export type CreateTaskInput = Parameters<typeof createTask>[0];
export type UpdateTaskInput = Parameters<typeof updateTask>[0];

interface TaskContextType {
  limit: number;
  page: number;
  tasks?: {
    currentCompany: string;
    currentProject: string;
    duration: string;
    id: string;
    title: string;
    status: TaskStatus;
  }[];
  totalTasks: number;
  openDrawer: boolean;
  taskData?: {
    duration: string;
    userId: string;
    id: string;
    currentProject: string | null;
    currentCompany: string | null;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    status: TaskStatus;
    progress: string | null;
    todo: string | null;
  } | null;
  isExecutingCreateTask: boolean;
  isExecutingUpdateTask: boolean;
  setPage: Dispatch<SetStateAction<number>>;
  executeGetTaskById: (input: { taskId: string }) => void;
  createTask: (data: CreateTaskInput) => Promise<void>;
  updateTask: (data: UpdateTaskInput) => Promise<void>;
  fetchTasks: () => Promise<void>;
  closeDrawer: () => void;
}

const TaskContext = createContext<TaskContextType>({
  limit: 4,
  page: 1,
  tasks: [],
  totalTasks: 0,
  openDrawer: false,
  isExecutingCreateTask: false,
  isExecutingUpdateTask: false,
  setPage: () => {},
  executeGetTaskById: () => {},
  createTask: async () => {},
  updateTask: async () => {},
  closeDrawer: async () => {},
  fetchTasks: async () => {},
});

const TaskProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const limit = useMemo(() => 4, []);
  const [page, setPage] = useState(1);
  const [openDrawer, setOpenDrawer] = useState(false);

  // ACTIONS
  // task list
  const {
    execute,
    result: { data },
  } = useAction(getTasksList);

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

  // HANDLERS

  // fetch tasks list
  const fetchTasks = async (): Promise<void> => {
    execute({ limit, skip: (page - 1) * limit });
  };
  // create task handler
  const onStartTask = async ({ title, progress, project }: CreateTaskInput): Promise<void> => {
    if (!title?.trim()) return;
    await executeCreateTask({ title, progress, project });
    if (page === 1) fetchTasks();
  };

  // update task handler
  const updateTaskHandler = async (data: UpdateTaskInput) => {
    if (!data?.id) return undefined;
    await executeUpdateTask(data);
    if (page == 1) fetchTasks();
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
        page,
        openDrawer,
        totalTasks: data?.total ?? 0,
        tasks: data?.tasks || [],
        taskData,
        isExecutingCreateTask: isExecuting,
        isExecutingUpdateTask,
        closeDrawer,
        setPage,
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
