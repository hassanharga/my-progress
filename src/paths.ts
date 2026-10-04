export const paths = {
  home: '/',
  dashboard: '/dashboard',
  projects: '/projects',
  insights: '/insights',
  reports: '/reports',
  settings: '/settings',
  project: (projectId: string) => `/projects/${encodeURIComponent(projectId)}`,
  auth: '/auth',
  playground: '/playground',
} as const;
