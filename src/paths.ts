export const paths = {
  home: '/',
  dashboard: '/dashboard',
  projects: '/projects',
  project: (projectId: string) => `/projects/${encodeURIComponent(projectId)}`,
  auth: '/auth',
  playground: '/playground',
} as const;
