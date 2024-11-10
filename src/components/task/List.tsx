'use client';

import { useEffect, useMemo, useState, type FC } from 'react';
import { type Task } from '@prisma/client';
import { useAction } from 'next-safe-action/hooks';

import { getTasksList } from '@/actions/task';

import TableData from '../shared/Table';

const List: FC = () => {
  const limit = useMemo(() => 4, []);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [tasks, setTasks] = useState<
    (Pick<Task, 'id' | 'title' | 'status' | 'currentProject' | 'currentCompany'> & { duration: string })[]
  >([]);

  const { execute } = useAction(getTasksList, {
    onSuccess: ({ data }) => {
      setTotalPages(data?.total || 0);
      setTasks(data?.tasks || []);
    },
  });

  useEffect(() => {
    execute({ limit, skip: (page - 1) * limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  return (
    <TableData
      captionLabel="A list of your recent tasks."
      headers={['Title', 'Status', 'Duration', 'Project', 'Company']}
      rows={tasks?.map((task) => [task.title, task.status, task.duration, task.currentProject, task.currentCompany])}
      currentPage={page}
      totalPages={Math.ceil(totalPages / limit)}
      onChangePage={(newPage) => {
        setPage(newPage);
      }}
    />
  );
};

export default List;
