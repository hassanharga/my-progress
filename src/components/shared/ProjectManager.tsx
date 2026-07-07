'use client';

import { useEffect, useState, type FC } from 'react';
import { Archive, Check, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';

import {
  archiveProject,
  createProject,
  getProjects,
  renameProject,
  unarchiveProject,
  type ProjectListItem,
} from '@/actions/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ProjectManager: FC = () => {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const { execute: loadProjects } = useAction(getProjects, {
    onSuccess: ({ data }) => {
      if (data) setProjects(data);
    },
  });

  // Load on mount (matches the useUserContext pattern)
  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { execute: executeCreate, isPending: isCreating } = useAction(createProject, {
    onSuccess: () => {
      setNewName('');
      loadProjects();
    },
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to create project'),
  });

  const { execute: executeRename } = useAction(renameProject, {
    onSuccess: () => loadProjects(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to rename project'),
  });

  const { execute: executeArchive } = useAction(archiveProject, {
    onSuccess: () => loadProjects(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to archive project'),
  });

  const { execute: executeUnarchive } = useAction(unarchiveProject, {
    onSuccess: () => loadProjects(),
    onError: ({ error }) => toast.error(error.serverError ?? 'Failed to unarchive project'),
  });

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    executeCreate({ name });
  };

  const startEdit = (p: ProjectListItem) => {
    setEditingId(p.id);
    setEditValue(p.name);
  };

  const commitEdit = () => {
    const name = editValue.trim();
    if (editingId && name) {
      executeRename({ id: editingId, name });
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Add new project */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="New project name"
          className="flex-1"
        />
        <Button variant="default" size="sm" onClick={handleAdd} disabled={isCreating || !newName.trim()} className="cursor-pointer shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {/* Active projects */}
      <div className="flex flex-col gap-050">
        {active.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-md border px-150 py-100">
            {editingId === p.id ? (
              <>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onBlur={commitEdit}
                  autoFocus
                  className="h-7 flex-1"
                />
                <Button variant="subtle" size="icon-sm" onClick={commitEdit} className="cursor-pointer shrink-0" aria-label="Save name">
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button variant="subtle" size="icon-sm" onClick={cancelEdit} className="cursor-pointer shrink-0" aria-label="Cancel edit">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="flex flex-1 items-center gap-075 text-start cursor-pointer min-w-0"
                >
                  <span className="truncate text-body font-weight-medium text-text">{p.name}</span>
                </button>
                <span className="shrink-0 text-body-small text-text-subtlest">{p.taskCount} tasks</span>
                <Button
                  variant="subtle"
                  size="icon-sm"
                  onClick={() => executeArchive({ id: p.id })}
                  className="cursor-pointer shrink-0"
                  title="Archive project"
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
        {active.length === 0 && (
          <p className="text-body-small text-text-subtle px-150 py-100">No projects yet. Create one above.</p>
        )}
      </div>

      {/* Archived projects (collapsible) */}
      {archived.length > 0 && (
        <div className="flex flex-col gap-050">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-075 px-150 py-050 text-body-small text-text-subtle cursor-pointer hover:text-text"
          >
            {showArchived ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Archived ({archived.length})
          </button>
          {showArchived &&
            archived.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border px-150 py-100 opacity-70">
                <span className="flex-1 truncate text-body text-text-subtle line-through">{p.name}</span>
                <span className="shrink-0 text-body-small text-text-subtlest">{p.taskCount} tasks</span>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => executeUnarchive({ id: p.id })}
                  className="cursor-pointer shrink-0"
                >
                  Unarchive
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
