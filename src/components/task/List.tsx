import type { FC } from 'react';
import { ClipboardList } from 'lucide-react';

import { useTaskContext } from '@/contexts/task.context';
import { EmptyState } from '@/components/shared/EmptyState';

import Status from '../shared/Status';
import TableData from '../shared/Table';
import { TaskDetails } from './Buttons/TaskDetails';

const List: FC = () => {
  const { executeGetTaskById, openDrawer, closeDrawer, setPage, taskData, tasks, totalTasks, limit, page } =
    useTaskContext();

  if (!tasks) return null;

  if (!tasks?.length) {
    return (
      <EmptyState
        icon={<ClipboardList className="w-16 h-16" />}
        title="No tasks found"
        description="You don't have any tasks yet. Create your first task to get started."
      />
    );
  }

  return (
    <>
      <TableData
        captionLabel="list of your tasks."
        headers={['Title', 'Status', 'Duration', 'Project', 'Company']}
        rows={tasks?.map((task, idx) => ({
          data: task,
          values: [
            task.title,
            <Status key={idx} status={task.status || ''} />,
            task.duration,
            task.currentProject || '-',
            task.currentCompany || '-',
          ],
        }))}
        currentPage={page}
        totalPages={Math.ceil(totalTasks / limit)}
        onChangePage={(newPage) => {
          setPage(newPage);
        }}
        onRowClick={(task) => {
          executeGetTaskById({ taskId: task?.id });
        }}
      />
      {/* task details modal */}
      {openDrawer ? <TaskDetails task={taskData} open={openDrawer} setOpen={closeDrawer} /> : null}
    </>
  );
};

export default List;
