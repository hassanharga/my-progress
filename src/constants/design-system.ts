export const DESIGN_TOKENS = {
  // Spacing scale (based on 4px grid)
  spacing: {
    '0': '0',
    px: '1px',
    '0.5': '0.125rem', // 2px
    '1': '0.25rem', // 4px
    '2': '0.5rem', // 8px
    '3': '0.75rem', // 12px
    '4': '1rem', // 16px
    '5': '1.25rem', // 20px
    '6': '1.5rem', // 24px
    '8': '2rem', // 32px
    '10': '2.5rem', // 40px
    '12': '3rem', // 48px
    '16': '4rem', // 64px
    '20': '5rem', // 80px
    '24': '6rem', // 96px
  },

  // Border radius scale
  borderRadius: {
    none: '0',
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Shadow scale
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },

  // Animation durations
  animations: {
    durations: {
      instant: '0ms',
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },
    easings: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Z-index scale
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
} as const;

// Status colors
export const STATUS_COLORS = {
  IN_PROGRESS: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    stripe: 'bg-blue-500',
  },
  PAUSED: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500/20',
    stripe: 'bg-yellow-500',
  },
  RESUMED: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
    stripe: 'bg-green-500',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    stripe: 'bg-emerald-500',
  },
  CANCELLED: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
    stripe: 'bg-red-500',
  },
} as const;

// Priority colors
export const PRIORITY_COLORS = {
  LOW: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600 dark:text-gray-400',
    icon: '🟢',
  },
  MEDIUM: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    icon: '🟡',
  },
  HIGH: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    icon: '🟠',
  },
  URGENT: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    icon: '🔴',
  },
} as const;

export type TaskStatus = keyof typeof STATUS_COLORS;
export type TaskPriority = keyof typeof PRIORITY_COLORS;
