'use client';

import { useEffect, useState, type FC } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useTaskContext } from '@/contexts/task.context';
import { FadeIn, SlideIn } from '@/components/shared/animations';
import TasksList from '@/components/task/List';
import { Button } from '@/components/ui/button';

import { StatsGrid } from '../ui-enhancements';
import { CreateTask } from './Buttons/CreateTask';
import { TaskDetails } from './Buttons/TaskDetails';
import { ExportTasks } from './Buttons/ExportTasks';

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

  useEffect(() => {
    const handler = () => setOpenCreateTaskDrawer(true);
    window.addEventListener('create-task', handler);
    return () => window.removeEventListener('create-task', handler);
  }, []);

  const { createTask, isExecutingCreateTask, taskData, openDrawer, closeDrawer } = useTaskContext();

  const handleCreateTask = async (data: { progress: string; title: string }) => {
    await createTask(data);
    setOpenCreateTaskDrawer(false);
    toast.success('Task created!', {
      description: 'Your new task is ready to go.',
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
            <Button variant="subtle" size="sm" className="cursor-pointer" onClick={() => setOpenCreateTaskDrawer(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
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

      {/* task details modal */}
      {openDrawer ? <TaskDetails task={taskData} open={openDrawer} setOpen={closeDrawer} /> : null}
    </>
  );
};

export default TaskPage;
