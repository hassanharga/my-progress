import type { FC } from 'react';

import { useTaskContext } from '@/contexts/task.context';

import Status from '../shared/Status';
import TableData from '../shared/Table';
import TaskDrawer from './TaskDrawer';

const List: FC = () => {
  const { executeGetTaskById, openDrawer, closeDrawer, setPage, taskData, tasks, totalTasks, limit, page } =
    useTaskContext();

  if (!tasks) return null;

  if (!tasks?.length) {
    return <div className="my-4 p-4">You don&apos;t have any task yet</div>;
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
      <TaskDrawer open={openDrawer} task={taskData} onClose={closeDrawer} />
    </>
  );
};

export default List;
