import ProjectsLayout from '@/app/projects/layout';
import { useAction } from 'next-safe-action/hooks';
import { renderToStaticMarkup } from 'react-dom/server';

import { paths } from '@/paths';
import { useUserContext } from '@/contexts/user.context';
import DashboardShell from '@/components/dashboard/DashboardShell';
import ProjectSwitcher, { handleProjectLinkClick, ProjectSwitcherLink } from '@/components/dashboard/ProjectSwitcher';

jest.mock('next-safe-action/hooks', () => ({ useAction: jest.fn() }));
jest.mock('@/actions/project', () => ({ getProjects: jest.fn(), switchProject: jest.fn() }));
jest.mock('@/contexts/user.context', () => ({ useUserContext: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/components/dashboard/DashboardTopBar', () => () => null);

describe('project navigation', () => {
  it.each([
    {
      label: 'ordinary primary click',
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      expected: true,
    },
    { label: 'Ctrl-click', button: 0, ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, expected: false },
    { label: 'Cmd-click', button: 0, ctrlKey: false, metaKey: true, shiftKey: false, altKey: false, expected: false },
    { label: 'Shift-click', button: 0, ctrlKey: false, metaKey: false, shiftKey: true, altKey: false, expected: false },
    { label: 'Alt-click', button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, expected: false },
    {
      label: 'middle click',
      button: 1,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      expected: false,
    },
    {
      label: 'secondary click',
      button: 2,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      expected: false,
    },
  ])('switches account project only for $label', ({ expected, label: _label, ...event }) => {
    const switchCurrentProject = jest.fn();

    handleProjectLinkClick(event, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', switchCurrentProject);

    if (expected) {
      expect(switchCurrentProject).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(switchCurrentProject).toHaveBeenCalledTimes(1);
    } else {
      expect(switchCurrentProject).not.toHaveBeenCalled();
    }
  });

  it('builds canonical project paths', () => {
    expect(paths.projects).toBe('/projects');
    expect(paths.project('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(
      '/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
  });

  it('renders a named direct workspace link for an active project', () => {
    const html = renderToStaticMarkup(
      <ProjectSwitcherLink
        id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        name="Research"
        selected={false}
        role="menuitem"
        tabIndex={-1}
      />
    );

    expect(html).toContain('href="/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"');
    expect(html).toContain('aria-label="Open Research workspace"');
    expect(html).toContain('Research');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('tabindex="-1"');
  });

  it('names the current project link and retains the selection marker', () => {
    const html = renderToStaticMarkup(
      <ProjectSwitcherLink id="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" name="Writing" selected />
    );

    expect(html).toContain('href="/projects/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"');
    expect(html).toContain('aria-label="Open Writing workspace (current project)"');
    expect(html).toContain('bg-selected');
  });

  it('mounts the shared shell for project routes', () => {
    const children = <h1>Project workspace</h1>;
    const element = ProjectsLayout({ children });

    expect(element.type).toBe(DashboardShell);
    expect(element.props.children).toBe(children);
  });

  it('replaces a settled failed user load with a visible retry instead of a skeleton', () => {
    jest.mocked(useUserContext).mockReturnValue({
      user: null,
      userLoading: false,
      userLoadFailed: true,
      refetchUser: jest.fn(),
      logout: jest.fn(),
      setUserData: jest.fn(),
    });
    jest
      .mocked(useAction)
      .mockReturnValue({ execute: jest.fn(), isExecuting: false } as unknown as ReturnType<typeof useAction>);

    const html = renderToStaticMarkup(<ProjectSwitcher onManageProjects={() => undefined} />);

    expect(html).toContain('Retry loading account');
    expect(html).not.toContain('data-slot="skeleton"');
  });
});
