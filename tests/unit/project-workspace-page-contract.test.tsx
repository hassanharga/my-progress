import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';

import { ProjectArchiveConfirmation } from '@/components/shared/ProjectManager';

jest.mock('next-safe-action/hooks', () => ({ useAction: jest.fn() }));
jest.mock('@/actions/project', () => ({
  archiveProject: jest.fn(),
  createProject: jest.fn(),
  getProjects: jest.fn(),
  renameProject: jest.fn(),
  unarchiveProject: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const projectPageSource = readFileSync(resolve(process.cwd(), 'src/app/projects/[projectId]/page.tsx'), 'utf8');
const projectsPageSource = readFileSync(resolve(process.cwd(), 'src/app/projects/page.tsx'), 'utf8');
const projectManagerSource = readFileSync(resolve(process.cwd(), 'src/components/shared/ProjectManager.tsx'), 'utf8');

describe('Project workspace route contract', () => {
  it('authenticates, awaits route state, and performs one owner-scoped read', () => {
    expect(projectPageSource).toContain('validateUserToken()');
    expect(projectPageSource).toContain('await params');
    expect(projectPageSource).toContain('await searchParams');
    expect(projectPageSource).toContain('parseProjectWorkspaceQuery');
    expect(projectPageSource).toContain('readProjectWorkspaceForOwner({');
    expect(projectPageSource).toContain('ownerId: user.id!');
    expect(projectPageSource).toContain('projectId');
    expect(projectPageSource).toContain('prisma: db');
  });

  it('converges invalid and inaccessible workspaces on not found', () => {
    expect(projectPageSource).toContain('projectIdSchema.safeParse');
    expect(projectPageSource.match(/notFound\(\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps private workspace metadata out of search indexes and composes once', () => {
    expect(projectPageSource).toContain('robots: { follow: false, index: false }');
    expect(projectPageSource.match(/<ProjectWorkspace\b/g)).toHaveLength(1);
    expect(projectPageSource).toContain('initialWorkspace={workspace}');
  });

  it('redirects only to an owned active project and otherwise renders the chooser', () => {
    expect(projectsPageSource).toContain('validateUserToken()');
    expect(projectsPageSource).toContain('ownerId: user.id!');
    expect(projectsPageSource).toContain('archived: false');
    expect(projectsPageSource).toContain('currentProjectId');
    expect(projectsPageSource).toContain('redirect(`/projects/${activeProject.id}`)');
    expect(projectsPageSource).toContain('<ProjectsIndex projects={projects} />');
  });

  it('reloads project choices only after confirmed archive and restore success', () => {
    expect(projectManagerSource).toContain('if (!data.ok)');
    expect(projectManagerSource).toContain('toast.error(data.error.message)');
    expect(projectManagerSource).toContain('onLifecycleSuccess');
    expect(projectManagerSource.match(/onSuccess: onLifecycleSuccess/g)).toHaveLength(2);
  });

  it('places the archive action behind a titled confirmation instead of the row trigger', () => {
    expect(projectManagerSource).toContain('<DialogTrigger asChild>');
    expect(projectManagerSource).toContain('<DialogTitle>Archive this project?</DialogTitle>');
    expect(projectManagerSource).toContain('<DialogDescription>');
    expect(projectManagerSource).toContain('Confirm archive');
    expect(projectManagerSource).not.toContain('onClick={() => executeArchive({ id: p.id })}');
  });

  it('does not invoke archive until the confirmation button is activated', () => {
    const onConfirm = jest.fn();
    const dialog = ProjectArchiveConfirmation({ name: 'Active project', onConfirm, pending: false });
    const descendants = (node: ReactNode): ReactElement<{ children?: ReactNode; onClick?: () => void }>[] =>
      Children.toArray(node).flatMap((child) => {
        if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(child)) return [];
        return [child, ...descendants(child.props.children)];
      });
    const elements = descendants(dialog);
    const trigger = elements.find(
      (element) =>
        element.props.children &&
        typeof element.props.children !== 'string' &&
        String(element.type).includes('DialogTrigger')
    );
    expect(trigger).toBeDefined();
    expect(onConfirm).not.toHaveBeenCalled();
    const confirm = elements.find((element) => element.props.children === 'Confirm archive');
    expect(typeof confirm?.props.onClick).toBe('function');
    confirm?.props.onClick?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
