import { TaskStatus } from '@prisma/client';

export const Statuses = {
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.PAUSED]: 'Paused',
  [TaskStatus.RESUMED]: 'Resumed',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.CANCELLED]: 'Cancelled',
};

export const StatusColors: Record<TaskStatus, { bgColor: string; textColor: string }> = {
  [TaskStatus.IN_PROGRESS]: { bgColor: '#FFE2C5', textColor: '#FF9D3F' },
  [TaskStatus.PAUSED]: { bgColor: '#cff7fe', textColor: '#04aad6' },
  [TaskStatus.RESUMED]: { bgColor: '#DAEDEE', textColor: '#365253' },
  [TaskStatus.COMPLETED]: { bgColor: '#E5F6EC', textColor: '#0AA45A' },
  [TaskStatus.CANCELLED]: { bgColor: '#ffc1a8', textColor: '#F04438' },
};
