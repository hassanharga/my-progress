'use client';

import { useEffect, useState } from 'react';
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

export default function ProjectSwitcher({ onManageProjects }: { onManageProjects: () => void }) {
  const { user, refetchUser } = useUserContext();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  const { execute: loadProjects } = useAction(getProjects, {
    onSuccess: ({ data }) => {
      if (data) setProjects(data);
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to load projects'),
  });

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { execute: executeSwitch } = useAction(switchProject, {
    onSuccess: () => {
      refetchUser();
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to switch project'),
  });

  const activeId = user?.currentProjectId;
  const activeName = user?.currentProject?.name
    ?? projects.find((p) => p.id === activeId)?.name;
  const activeProjects = projects.filter((p) => !p.archived);

  const triggerLabel = activeName ?? (activeProjects.length === 0 ? 'Create a project' : 'Select project');

  const handleTriggerClick = () => {
    if (activeProjects.length === 0) {
      onManageProjects();
    }
  };

  if (user === null || (user?.currentProjectId && !activeName && projects.length === 0)) {
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
        if (open) loadProjects();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          className="flex cursor-pointer items-center gap-075 rounded-md px-075 py-050 text-left hover:bg-neutral-subtle-hovered transition-colors"
          onClick={handleTriggerClick}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-container">
            <FolderOpen className="h-3.5 w-3.5 text-icon-subtle" />
          </div>
          <span className={`truncate text-body font-weight-medium ${activeName ? 'text-text' : 'text-text-subtle'}`}>
            {triggerLabel}
          </span>
          {activeProjects.length > 0 && <ChevronDown className="h-4 w-4 shrink-0 text-icon-subtle" />}
        </button>
      </DropdownMenuTrigger>
      {activeProjects.length > 0 && (
        <DropdownMenuContent side="bottom" align="start" className="w-56">
          {activeProjects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => executeSwitch({ id: p.id })}
              className={`cursor-pointer ${p.id === activeId ? 'bg-selected text-text-selected' : ''}`}
            >
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === activeId && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onManageProjects} className="cursor-pointer">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Manage projects
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
