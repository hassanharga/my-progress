import { useEffect, useMemo, useState, type FC } from 'react';
import { useAction } from 'next-safe-action/hooks';

import type { Task, TaskWithLoggedTime } from '@/types/task';
import { getTaskById, getTasksList } from '@/actions/task';

import Status from '../shared/Status';
import TableData from '../shared/Table';
import TaskDrawer from './TaskDrawer';

const List: FC = () => {
  const limit = useMemo(() => 4, []);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [tasks, setTasks] = useState<
    (Pick<Task, 'id' | 'title' | 'status' | 'currentProject' | 'currentCompany'> & { duration: string })[]
  >([]);

  const [openDrawer, setOpenDrawer] = useState(false);
  const [taskDetails, setTaskDetails] = useState<TaskWithLoggedTime>();

  // task list
  const { execute } = useAction(getTasksList, {
    onSuccess: ({ data }) => {
      setTotalPages(data?.total || 0);
      setTasks(data?.tasks || []);
    },
  });

  // get task by id
  const { execute: executeGetTaskById } = useAction(getTaskById, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setOpenDrawer(true);
      setTaskDetails(data);
    },
  });

  useEffect(() => {
    execute({ limit, skip: (page - 1) * limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  if (!tasks.length) {
    return <div className="mt-4">You don&apos;t have any task yet</div>;
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
        totalPages={Math.ceil(totalPages / limit)}
        onChangePage={(newPage) => {
          setPage(newPage);
        }}
        onRowClick={(task) => {
          executeGetTaskById({ taskId: task?.id });
        }}
      />
      <TaskDrawer
        open={openDrawer}
        task={taskDetails}
        onClose={() => {
          setOpenDrawer(false);
          setTaskDetails(undefined);
        }}
      />
    </>
  );
};

export default List;
