export const TaskStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  PAUSED: 'PAUSED',
  RESUMED: 'RESUMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const Statuses = {
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.PAUSED]: 'Paused',
  [TaskStatus.RESUMED]: 'Resumed',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.CANCELLED]: 'Cancelled',
};

export const StatusColors: Record<keyof typeof TaskStatus, { bgColor: string; textColor: string }> = {
  [TaskStatus.IN_PROGRESS]: { bgColor: '#FFE2C5', textColor: '#FF9D3F' },
  [TaskStatus.PAUSED]: { bgColor: '#cff7fe', textColor: '#04aad6' },
  [TaskStatus.RESUMED]: { bgColor: '#DAEDEE', textColor: '#365253' },
  [TaskStatus.COMPLETED]: { bgColor: '#E5F6EC', textColor: '#0AA45A' },
  [TaskStatus.CANCELLED]: { bgColor: '#ffc1a8', textColor: '#F04438' },
};
