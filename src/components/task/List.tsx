import { useEffect, useMemo, useState, type FC } from 'react';
import { useAction } from 'next-safe-action/hooks';

import { getTaskById, getTasksList } from '@/actions/task';

import Status from '../shared/Status';
import TableData from '../shared/Table';
import TaskDrawer from './TaskDrawer';

const List: FC = () => {
  const limit = useMemo(() => 4, []);
  const [page, setPage] = useState(1);

  const [openDrawer, setOpenDrawer] = useState(false);

  // task list
  const {
    execute,
    result: { data },
  } = useAction(getTasksList);

  // get task by id
  const {
    execute: executeGetTaskById,
    result: { data: taskData },
  } = useAction(getTaskById, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setOpenDrawer(true);
    },
  });

  useEffect(() => {
    execute({ limit, skip: (page - 1) * limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  if (!data) return null;

  if (!data?.tasks.length) {
    return <div className="my-4 p-4">You don&apos;t have any task yet</div>;
  }

  return (
    <>
      <TableData
        captionLabel="list of your tasks."
        headers={['Title', 'Status', 'Duration', 'Project', 'Company']}
        rows={data?.tasks?.map((task, idx) => ({
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
        totalPages={Math.ceil(data?.total / limit)}
        onChangePage={(newPage) => {
          setPage(newPage);
        }}
        onRowClick={(task) => {
          executeGetTaskById({ taskId: task?.id });
        }}
      />
      <TaskDrawer
        open={openDrawer}
        task={taskData}
        onClose={() => {
          setOpenDrawer(false);
        }}
      />
    </>
  );
};

export default List;
