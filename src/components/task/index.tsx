'use client';

import { MouseEvent, useState, type FC } from 'react';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

import type { LastTaskWithLoggedTime, TaskWithLoggedTime } from '@/types/task';
import { useTaskContext } from '@/contexts/task.context';
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
  lastTask: LastTaskWithLoggedTime | null;
  stats: {
    totalTime: string;
    completedTasks: number;
    activeTasks: number;
    thisWeekTime: string;
  };
};

const TaskPage: FC<Props> = ({ task, lastTask, stats }) => {
  const [openCreateTaskDrawer, setOpenCreateTaskDrawer] = useState(false);
  const [openUpdateTaskDrawer, setOpenUpdateTaskDrawer] = useState(false);
  const [openTaskDetailsDrawer, setOpenTaskDetailsDrawer] = useState(false);

  const [selectedTask, setSelectedTask] = useState<TaskWithLoggedTime | null>(null);

  const { updateTask, createTask, isExecutingCreateTask, isExecutingUpdateTask } = useTaskContext();

  const handleCreateTask = async (data: { progress: string; title: string; project: string }) => {
    await createTask(data);
    setOpenCreateTaskDrawer(false);
    toast.success('Task created!', {
      description: 'Your new task is ready to go.',
    });
  };

  const handleCompleteTask = async (data: { progress?: string; todo?: string }) => {
    if (!task) return;
    await updateTask({ status: 'COMPLETED', id: task.id, ...data });
    setOpenUpdateTaskDrawer(false);
    toast.success('Task completed! 🎉', {
      description: 'Great job! The task has been marked as complete.',
    });
  };

  const handlePlay = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!task) return;
    updateTask({ status: 'RESUMED', id: task.id });
  };

  const handlePause = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!task) return;
    updateTask({ status: 'PAUSED', id: task.id });
  };

  const handleComplete = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpenUpdateTaskDrawer(true);
  };

  const openTaskDetailsAction = (task: TaskWithLoggedTime) => {
    if (!task) return;
    setSelectedTask(task);
    setOpenTaskDetailsDrawer(true);
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
        />
      </FadeIn>

      {/* Current task - Enhanced */}
      <FadeIn delay={0} className="w-full sm:w-1/2">
        {task ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Current Task</h2>
            <div className="space-y-4">
              <EnhancedTaskCard
                task={task}
                onPlayAction={handlePlay}
                onPauseAction={handlePause}
                onCompleteAction={handleComplete}
                openTaskDetailsAction={() => openTaskDetailsAction(task)}
                isLoading={isExecutingUpdateTask}
              />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardList className="w-16 h-16" />}
            title="No active task"
            description="Start a new task to begin tracking your work."
            action={{
              label: 'Create Task',
              onClick: () => {
                setOpenCreateTaskDrawer(true);
              },
            }}
          />
        )}
      </FadeIn>

      {/* Last completed task */}
      {lastTask && (
        <SlideIn direction="up" delay={0.1} className="w-full sm:w-1/2">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Last Completed Task</h2>
            <EnhancedTaskCard task={lastTask} openTaskDetailsAction={() => openTaskDetailsAction(lastTask)} />
          </div>
        </SlideIn>
      )}

      {/* List of user tasks */}
      <SlideIn direction="up" delay={0.2} className="w-full sm:w-2/3 overflow-auto">
        <TasksList />
      </SlideIn>

      {/* create task modal */}
      {openCreateTaskDrawer ? (
        <CreateTask
          open={openCreateTaskDrawer}
          setOpen={setOpenCreateTaskDrawer}
          createTask={handleCreateTask}
          isLoading={isExecutingCreateTask}
          lastTaskTodo={lastTask?.todo || ''}
        />
      ) : null}

      {/* complete task modal */}
      {openUpdateTaskDrawer ? (
        <CompleteTask
          completeTask={handleCompleteTask}
          isLoading={isExecutingUpdateTask}
          taskProgress={task?.progress || ''}
          open={openUpdateTaskDrawer}
          setOpen={() => setOpenUpdateTaskDrawer}
        />
      ) : null}

      {/* task details modal */}
      {openTaskDetailsDrawer ? (
        <TaskDetails
          task={selectedTask}
          open={openTaskDetailsDrawer}
          setOpen={() => {
            setOpenTaskDetailsDrawer(false);
            setSelectedTask(null);
          }}
        />
      ) : null}
    </>
  );
};

export default TaskPage;
