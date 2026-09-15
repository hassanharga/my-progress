'use client';

import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useTaskContext } from '@/contexts/task.context';
import { FadeIn, SlideIn } from '@/components/shared/animations';
import { restoreOverlayFocus } from '@/components/shared/overlay-focus';
import TasksList from '@/components/task/List';
import { Button } from '@/components/ui/button';

import { StatsGrid } from '../ui-enhancements';
import { CreateTask } from './Buttons/CreateTask';
import { ExportTasks } from './Buttons/ExportTasks';
import { TaskDetails } from './Buttons/TaskDetails';

type Props = {
  stats: {
    totalTime: string;
    completedTasks: number;
    activeTasks: number;
    thisWeekTime: string;
    thisMonthTime: string;
  };
  lastTaskTodo?: string;
};

const TaskPage: FC<Props> = ({ stats, lastTaskTodo }) => {
  const [openCreateTaskDrawer, setOpenCreateTaskDrawer] = useState(false);
  const createTaskOpenerRef = useRef<HTMLElement | null>(null);
  const taskDetailsOpenerRef = useRef<HTMLElement | null>(null);

  const openCreateTask = useCallback(() => {
    createTaskOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpenCreateTaskDrawer(true);
  }, []);

  const handleCreateTaskOpenChange = (open: boolean) => {
    setOpenCreateTaskDrawer(open);
    if (!open) restoreOverlayFocus(createTaskOpenerRef.current);
  };

  useEffect(() => {
    const handler = () => openCreateTask();
    window.addEventListener('create-task', handler);
    return () => window.removeEventListener('create-task', handler);
  }, [openCreateTask]);

  const { createTask, executeGetTaskById, isExecutingCreateTask, taskData, openDrawer, closeDrawer } = useTaskContext();

  const openTaskDetails = (taskId: string, opener: HTMLElement) => {
    taskDetailsOpenerRef.current = opener;
    executeGetTaskById({ taskId });
  };

  const handleTaskDetailsOpenChange = (open: boolean) => {
    if (open) return;
    closeDrawer();
    restoreOverlayFocus(taskDetailsOpenerRef.current);
  };

  const handleCreateTask = async (data: { progress: string; title: string }) => {
    const result = await createTask({ ...data, startNow: true });
    if (!result.ok) {
      toast.error(result.error ?? 'Task was not created');
      return;
    }
    handleCreateTaskOpenChange(false);
    toast.success('Task created!', {
      description: 'Your new task is running.',
    });
  };

  return (
    <>
      {/* Statistics */}
      <FadeIn delay={0} className="w-full max-w-7xl">
        <StatsGrid
          totalTime={stats.totalTime}
          completedTasks={stats.completedTasks}
          activeTasks={stats.activeTasks}
          thisWeekTime={stats.thisWeekTime}
          thisMonthTime={stats.thisMonthTime}
        />
      </FadeIn>

      {/* List of user tasks */}
      <SlideIn direction="up" delay={0.2} className="w-full">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface/80 backdrop-blur py-200 -mx-2 px-2 mb-200">
          <div className="flex items-center gap-075">
            <h2 className="text-heading-small font-weight-bold text-text">Tasks</h2>
          </div>
          <div className="flex items-center gap-2">
            <ExportTasks />
            <Button variant="subtle" size="sm" className="cursor-pointer" onClick={openCreateTask}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </div>
        <TasksList onOpenTask={openTaskDetails} />
      </SlideIn>

      {/* create task modal */}
      {openCreateTaskDrawer ? (
        <CreateTask
          open={openCreateTaskDrawer}
          setOpen={handleCreateTaskOpenChange}
          createTask={handleCreateTask}
          isLoading={isExecutingCreateTask}
          lastTaskTodo={lastTaskTodo || ''}
        />
      ) : null}

      {/* task details modal */}
      {openDrawer ? <TaskDetails task={taskData} open={openDrawer} setOpen={handleTaskDetailsOpenChange} /> : null}
    </>
  );
};

export default TaskPage;
