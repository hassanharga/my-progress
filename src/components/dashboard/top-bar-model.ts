export type ProjectSwitcherPhase = 'idle' | 'loading' | 'switching' | 'load-error' | 'switch-error';

export type ProjectSwitcherViewInput = Readonly<{
  phase: ProjectSwitcherPhase;
  activeName: string | null;
  projectCount: number;
}>;

export type ProjectSwitcherView = Readonly<{
  label: string;
  busy: boolean;
  canRetry: boolean;
}>;

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export const getProjectSwitcherView = ({
  phase,
  activeName,
  projectCount,
}: ProjectSwitcherViewInput): ProjectSwitcherView => ({
  label: activeName ?? (phase === 'loading' ? 'Loading projects' : projectCount === 0 ? 'Create a project' : 'Select project'),
  busy: phase === 'loading' || phase === 'switching',
  canRetry: phase === 'load-error',
});
