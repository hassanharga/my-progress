import type { FC } from 'react';
import { STATUS_TOKENS } from '@/constants/status';

import type { TaskStatus } from '@/types/task';

type Props = {
  status: TaskStatus;
};

const Status: FC<Props> = ({ status }) => {
  const tokens = STATUS_TOKENS[status];

  if (!tokens) return null;

  return (
    <span
      className={`inline-flex items-center rounded-xs border px-050 text-body-small font-weight-medium ${tokens.badge}`}
    >
      {tokens.label}
    </span>
  );
};

export default Status;
