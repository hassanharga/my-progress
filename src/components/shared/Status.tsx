import type { FC } from 'react';

import { STATUS_STYLES, Statuses } from '@/constants/status';

import { TaskStatus } from '../../../generated/prisma/enums';

type Props = {
  status: TaskStatus;
};

const Status: FC<Props> = ({ status }) => {
  const displayStatus = status === 'RESUMED' ? 'IN_PROGRESS' : status;
  const style = STATUS_STYLES[displayStatus as keyof typeof STATUS_STYLES];

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-center text-sm font-medium ${style.badge}`}
    >
      {Statuses[displayStatus]}
    </span>
  );
};

export default Status;
