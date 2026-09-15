export const TaskStatus = {
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const Statuses = {
  [TaskStatus.READY]: 'Ready',
  [TaskStatus.IN_PROGRESS]: 'In progress',
  [TaskStatus.PAUSED]: 'Paused',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.CANCELLED]: 'Cancelled',
};

export const STATUS_TOKENS = {
  READY: {
    badge: 'bg-neutral-subtle text-text-subtle border-border',
    stripe: 'bg-neutral',
    label: 'Ready',
  },
  IN_PROGRESS: {
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
