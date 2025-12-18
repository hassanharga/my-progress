import type { FC } from 'react';
import { StatusColors, Statuses } from '@/constants/status';

import { type TaskStatus } from '../../../generated/prisma/client';

type Props = {
  status: TaskStatus;
};

const Status: FC<Props> = ({ status }) => {
  return (
    <div
      className="p-1 rounded-[5px] text-center text-sm font-medium"
      style={{
        color: StatusColors[status].textColor,
        backgroundColor: StatusColors[status].bgColor,
      }}
    >
      {status === 'RESUMED' ? Statuses.IN_PROGRESS : Statuses[status]}
    </div>
  );
};

export default Status;
