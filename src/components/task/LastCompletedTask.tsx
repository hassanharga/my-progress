import type { FC } from 'react';
import { type Task } from '@prisma/client';

type Props = {
  task: Task | null;
};

const LastCompletedTask: FC<Props> = ({}) => {
  return <div>LastCompletedTask</div>;
};

export default LastCompletedTask;
