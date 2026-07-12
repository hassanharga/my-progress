export const TaskStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  PAUSED: 'PAUSED',
  RESUMED: 'RESUMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const Statuses = {
  [TaskStatus.IN_PROGRESS]: 'In progress',
  [TaskStatus.PAUSED]: 'Paused',
  [TaskStatus.RESUMED]: 'In progress',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.CANCELLED]: 'Cancelled',
};

export const STATUS_TOKENS = {
  IN_PROGRESS: {
    badge: 'bg-information-subtler text-text-information-bolder border-border-information',
    stripe: 'bg-information-bold',
    label: 'In progress',
  },
  RESUMED: {
    badge: 'bg-information-subtler text-text-information-bolder border-border-information',
    stripe: 'bg-information-bold',
    label: 'In progress',
  },
  PAUSED: {
    badge: 'bg-warning-subtler text-text-warning-bolder border-border-warning',
    stripe: 'bg-warning-bold',
    label: 'Paused',
  },
  COMPLETED: {
    badge: 'bg-success-subtler text-text-success-bolder border-border-success',
    stripe: 'bg-success-bold',
    label: 'Completed',
  },
  CANCELLED: {
    badge: 'bg-danger-subtler text-text-danger-bolder border-border-danger',
    stripe: 'bg-danger-bold',
    label: 'Cancelled',
  },
} as const;

export const STATUS_STYLES = STATUS_TOKENS;
