'use client';

import { MouseEvent, useEffect, useState, type FC } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';

import type { TaskWithLoggedTime } from '@/types/task';
import { useTaskContext } from '@/contexts/task.context';
import { Button } from '@/components/ui/button';
import { FadeIn, SlideIn } from '@/components/shared/animations';
import { EmptyState } from '@/components/shared/EmptyState';
import { EnhancedTaskCard } from '@/components/task/EnhancedCard';
import TasksList from '@/components/task/List';

import { StatsGrid } from '../ui-enhancements';
import { CompleteTask } from './Buttons/CompleteTask';
import { CreateTask } from './Buttons/CreateTask';
import { TaskDetails } from './Buttons/TaskDetails';

type Props = {
  task: TaskWithLoggedTime | null;
  stats: {
    totalTime: string;
    completedTasks: number;
    thisWeekTime: string;
    thisMonthTime: string;
  };
  lastTaskTodo?: string;
};

const TaskPage: FC<Props> = ({ task, stats, lastTaskTodo }) => {
  const [openCreateTaskDrawer, setOpenCreateTaskDrawer] = useState(false);
  const [openCompleteTaskDrawer, setOpenCompleteTaskDrawer] = useState(false);

  useEffect(() => {
    const handler = () => setOpenCreateTaskDrawer(true);
    window.addEventListener('create-task', handler);
    return () => window.removeEventListener('create-task', handler);
  }, []);

  const {
    updateTask,
    createTask,
    isExecutingCreateTask,
    isExecutingUpdateTask,
    executeGetTaskById,
    taskData,
    openDrawer,
    closeDrawer,
  } = useTaskContext();

  const handleCreateTask = async (data: { progress: string; title: string; project: string }) => {
    await createTask(data);
    setOpenCreateTaskDrawer(false);
    toast.success('Task created!', {
      description: 'Your new task is ready to go.',
    });
  };

  const handleCompleteTask = async (data: { progress?: string; todo?: string }) => {
    if (!task || isExecutingUpdateTask) return;
    await updateTask({ status: 'COMPLETED', id: task.id, ...data });
    setOpenCompleteTaskDrawer(false);
    toast.success('Task completed! 🎉', {
      description: 'Great job! The task has been marked as complete.',
    });
  };

  const handlePlay = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!task || isExecutingUpdateTask) return;
    updateTask({ status: 'RESUMED', id: task.id });
  };

  const handlePause = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!task || isExecutingUpdateTask) return;
    updateTask({ status: 'PAUSED', id: task.id });
  };

  const handleComplete = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpenCompleteTaskDrawer(true);
  };

  const openTaskDetailsAction = (t: TaskWithLoggedTime) => {
    if (!t || isExecutingUpdateTask) return;
    executeGetTaskById({ taskId: t.id });
  };

  return (
    <>
      {/* Statistics */}
      <FadeIn delay={0} className="w-full max-w-7xl">
        <StatsGrid
          totalTime={stats.totalTime}
          completedTasks={stats.completedTasks}
          thisWeekTime={stats.thisWeekTime}
          thisMonthTime={stats.thisMonthTime}
        />
      </FadeIn>

      {/* Current task */}
      <FadeIn delay={0} className="w-full sm:w-1/2">
        {task ? (
          <div className="space-y-4">
            <h2 className="text-heading-small font-weight-bold text-text">Current task</h2>
            <EnhancedTaskCard
              task={task}
              onPlayAction={handlePlay}
              onPauseAction={handlePause}
              onCompleteAction={handleComplete}
              openTaskDetailsAction={() => openTaskDetailsAction(task)}
              isLoading={isExecutingUpdateTask}
            />
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardList className="w-16 h-16" />}
            title="No active task"
            description="Start a new task to begin tracking your work."
            action={{
              label: 'Create task',
              onClick: () => setOpenCreateTaskDrawer(true),
            }}
          />
        )}
      </FadeIn>

      {/* List of user tasks */}
      <SlideIn direction="up" delay={0.2} className="w-full">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface/80 backdrop-blur py-200 -mx-2 px-2 mb-200">
          <div className="flex items-center gap-075">
            <h2 className="text-heading-small font-weight-bold text-text">Tasks</h2>
          </div>
          <Button variant="subtle" size="sm" className="cursor-pointer" onClick={() => setOpenCreateTaskDrawer(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
        <TasksList />
      </SlideIn>

      {/* create task modal */}
      {openCreateTaskDrawer ? (
        <CreateTask
          open={openCreateTaskDrawer}
          setOpen={setOpenCreateTaskDrawer}
          createTask={handleCreateTask}
          isLoading={isExecutingCreateTask}
          lastTaskTodo={lastTaskTodo || ''}
        />
      ) : null}

      {/* complete task modal */}
      {openCompleteTaskDrawer ? (
        <CompleteTask
          completeTask={handleCompleteTask}
          isLoading={isExecutingUpdateTask}
          taskProgress={task?.progress || ''}
          open={openCompleteTaskDrawer}
          setOpen={setOpenCompleteTaskDrawer}
        />
      ) : null}

      {/* task details modal */}
      {openDrawer ? <TaskDetails task={taskData} open={openDrawer} setOpen={closeDrawer} /> : null}
    </>
  );
};

export default TaskPage;
