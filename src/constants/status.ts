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
  [TaskStatus.PAUSED]: { bgColor: '#FFE2C5', textColor: '#FF9D3F' },
  [TaskStatus.IN_PROGRESS]: { bgColor: '#cff7fe', textColor: '#04aad6' },
  [TaskStatus.RESUMED]: { bgColor: '#DAEDEE', textColor: '#365253' },
  [TaskStatus.COMPLETED]: { bgColor: '#E5F6EC', textColor: '#0AA45A' },
  [TaskStatus.CANCELLED]: { bgColor: '#ffc1a8', textColor: '#F04438' },
};

/**
 * Unified status styling — Tailwind class strings.
 * Single source of truth for all status badge/stripe/card colors.
 */
export const STATUS_STYLES = {
  IN_PROGRESS: {
    badge: 'bg-primary/10 text-primary border-primary/20',
    stripe: 'bg-primary',
  },
  PAUSED: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    stripe: 'bg-amber-500',
  },
  RESUMED: {
    badge: 'bg-accent/10 text-accent border-accent/20',
    stripe: 'bg-accent',
  },
  COMPLETED: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    stripe: 'bg-emerald-500',
  },
  CANCELLED: {
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    stripe: 'bg-red-500',
  },
} as const;
