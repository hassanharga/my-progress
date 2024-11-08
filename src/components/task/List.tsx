'use client';

import { useEffect, useMemo, useState, type FC } from 'react';
import { useAction } from 'next-safe-action/hooks';

import { getTasks } from '@/actions/task';

import TableData from '../shared/Table';

const List: FC = () => {
  const limit = useMemo(() => 1, []);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const { execute } = useAction(getTasks, {
    onSuccess: ({ data }) => {
      console.log(data);
      setTotalPages(data?.total || 0);
    },
  });

  useEffect(() => {
    execute({ limit, skip: (page - 1) * limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TableData
      captionLabel="A list of your recent tasks."
      headers={['Title', 'Status', 'Time', 'Project', 'Company']}
      rows={[{ Title: 'task 1', status: 'status', time: 'time', project: 'project', company: 'company' }]}
      currentPage={page}
      totalPages={Math.ceil(totalPages / limit)}
      onChangePage={(newPage) => {
        setPage(newPage);
      }}
    />
  );
};

export default List;
