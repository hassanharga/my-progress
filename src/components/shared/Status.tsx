import type { FC } from 'react';

import { STATUS_TOKENS } from '@/constants/status';

import { TaskStatus } from '../../../generated/prisma/enums';

type Props = {
  status: TaskStatus;
};

const Status: FC<Props> = ({ status }) => {
  const displayStatus = status === 'RESUMED' ? 'IN_PROGRESS' : status;
  const tokens = STATUS_TOKENS[displayStatus as keyof typeof STATUS_TOKENS];

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
