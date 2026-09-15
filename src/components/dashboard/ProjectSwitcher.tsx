'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, FolderOpen, Settings as SettingsIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import { getProjects, switchProject, type ProjectListItem } from '@/actions/project';
import { useUserContext } from '@/contexts/user.context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

import { getProjectSwitcherView, type ProjectSwitcherPhase } from './top-bar-model';

export default function ProjectSwitcher({ onManageProjects }: { onManageProjects: (opener: HTMLElement) => void }) {
  const { user, refetchUser } = useUserContext();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [switchFailed, setSwitchFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const { execute: executeLoadProjects, isExecuting: isLoadingProjects } = useAction(getProjects, {
    onSuccess: ({ data }) => {
      setLoadFailed(false);
      if (data) setProjects(data);
    },
    onError: ({ error }) => {
      setLoadFailed(true);
      toast.error(error.serverError ?? 'Failed to load projects');
    },
  });

  const loadProjects = () => {
    setLoadFailed(false);
    executeLoadProjects();
  };

  useEffect(() => {
    executeLoadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { execute: executeSwitch, isExecuting: isSwitching } = useAction(switchProject, {
    onSuccess: () => {
      setSwitchFailed(false);
      refetchUser();
      router.refresh();
    },
    onError: ({ error }) => {
      setSwitchFailed(true);
      toast.error(error.serverError ?? 'Failed to switch project');
    },
  });

  const activeId = user?.currentProjectId;
  const activeName = user?.currentProject?.name
    ?? projects.find((p) => p.id === activeId)?.name;
  const activeProjects = projects.filter((p) => !p.archived);

  const phase: ProjectSwitcherPhase = loadFailed
    ? 'load-error'
    : switchFailed
      ? 'switch-error'
      : isLoadingProjects
        ? 'loading'
        : isSwitching
          ? 'switching'
          : 'idle';
  const view = getProjectSwitcherView({
    phase,
    activeName: activeName ?? null,
    projectCount: activeProjects.length,
  });

  const handleTriggerClick = () => {
    if (activeProjects.length === 0 && !view.canRetry) {
      if (triggerRef.current) onManageProjects(triggerRef.current);
    }
  };

  const handleSwitch = (id: string) => {
    setSwitchFailed(false);
    executeSwitch({ id });
  };

  if (user === null || (user?.currentProjectId && !activeName && projects.length === 0 && isLoadingProjects)) {
    return (
      <div className="flex items-center gap-075 px-075 py-050">
        <Skeleton className="h-6 w-6 rounded-sm" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && !loadFailed) loadProjects();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          className="flex cursor-pointer items-center gap-075 rounded-md px-075 py-050 text-left hover:bg-neutral-subtle-hovered transition-colors"
          onClick={handleTriggerClick}
          aria-label={activeName ? `Current project: ${activeName}` : view.label}
          aria-busy={view.busy}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-container">
            <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
          </div>
          <span className={`truncate text-body font-weight-medium ${activeName ? 'text-text' : 'text-text-subtle'}`}>
            {view.label}
          </span>
          {activeProjects.length > 0 && <ChevronDown className="h-4 w-4 shrink-0 text-icon-subtle" />}
        </button>
      </DropdownMenuTrigger>
      {(activeProjects.length > 0 || view.canRetry) && (
        <DropdownMenuContent side="bottom" align="start" className="w-56">
          {activeProjects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => handleSwitch(p.id)}
              disabled={isSwitching}
              className={`cursor-pointer ${p.id === activeId ? 'bg-selected text-text-selected' : ''}`}
            >
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === activeId && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
          {view.canRetry ? (
            <DropdownMenuItem onSelect={loadProjects} className="cursor-pointer">
              Retry loading projects
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              if (triggerRef.current) onManageProjects(triggerRef.current);
            }}
            className="cursor-pointer"
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            Manage projects
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
