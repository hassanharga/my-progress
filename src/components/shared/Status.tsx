import type { FC } from 'react';

import { STATUS_STYLES, Statuses } from '@/constants/status';

import { TaskStatus } from '../../../generated/prisma/enums';

type Props = {
  status: TaskStatus;
};

const Status: FC<Props> = ({ status }) => {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-center text-sm font-medium ${style.badge}`}
    >
      {status === 'RESUMED' ? Statuses.IN_PROGRESS : Statuses[status]}
    </span>
  );
};

export default Status;
