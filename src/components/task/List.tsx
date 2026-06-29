import { useEffect, type FC } from 'react';
import { ClipboardList } from 'lucide-react';

import { useTaskContext } from '@/contexts/task.context';
import { EmptyState } from '@/components/shared/EmptyState';

import Status from '../shared/Status';
import TableData from '../shared/Table';

const List: FC = () => {
  const { executeGetTaskById, setPage, tasks, totalTasks, limit, page, fetchTasks } = useTaskContext();

  // fetch tasks list on page or limit change
  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, page]);

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
    </>
  );
};

export default List;
