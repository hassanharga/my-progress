import type { ReactElement } from 'react';

import ProjectSwitcher from '../../src/components/dashboard/ProjectSwitcher';
import FirstProjectForm from '../../src/components/onboarding/FirstProjectForm';
import FirstUseToday from '../../src/components/onboarding/FirstUseToday';
import { TodayCockpit } from '../../src/components/today/TodayCockpit';
import type { TodayViewModel } from '../../src/server/today/today-types';
import type { AccountProfile } from '../../src/types/user';

const mockExecute = jest.fn();
const mockReadAccount = jest.fn();
let mockUser: AccountProfile | null = null;
const mockSetUser = jest.fn((account: AccountProfile) => {
  mockUser = account;
});
let mockTrackHeaderEffects = false;
let mockHeaderDeps: unknown[] | undefined;
let mockCallbacks: { onSuccess: (arg: { data: unknown }) => void; onError: () => void; onSettled: () => void };
let mockStates: unknown[] = [];
let mockRefs: { current: unknown }[] = [];
let mockStateIndex = 0;
let mockRefIndex = 0;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void, deps: unknown[] | undefined) => {
    if (!mockTrackHeaderEffects) return;
    if (!mockHeaderDeps || deps?.some((value, index) => value !== mockHeaderDeps?.[index])) effect();
    mockHeaderDeps = deps;
  },
  useState: (initial: unknown) => {
    const i = mockStateIndex++;
    if (!(i in mockStates)) mockStates[i] = typeof initial === 'function' ? initial() : initial;
    return [
      mockStates[i],
      (value: unknown) => {
        mockStates[i] = typeof value === 'function' ? value(mockStates[i]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const i = mockRefIndex++;
    return mockRefs[i] ?? (mockRefs[i] = { current: initial });
  },
}));
jest.mock('next-safe-action/hooks', () => ({
  useAction: (_action: unknown, callbacks: typeof mockCallbacks) => {
    mockCallbacks = callbacks;
    return { execute: mockExecute, executeAsync: mockReadAccount, isPending: false };
  },
}));
jest.mock('../../src/actions/project', () => ({ createFirstProject: jest.fn() }));
jest.mock('../../src/actions/today', () => ({
  createTodayTask: jest.fn(),
  mutateToday: jest.fn(),
  transitionTodayTask: jest.fn(),
}));
jest.mock('../../src/contexts/user.context', () => ({
  useUserContext: () => ({
    user: mockUser,
    userLoading: false,
    userLoadFailed: false,
    refetchUser: jest.fn(),
    setUserData: mockSetUser,
  }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
const children = (node: unknown): ReactElement<Record<string, unknown>>[] => {
  if (Array.isArray(node)) return node.flatMap(children);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<Record<string, unknown>>;
  return [element, ...children(element.props.children)];
};
const saved = jest.fn();
const canonical = jest.fn();
const render = () => {
  mockStateIndex = mockRefIndex = 0;
  return children(FirstProjectForm({ onSaved: saved, onCanonical: canonical }));
};
const submit = (nodes = render()) =>
  (nodes.find((n) => n.type === 'form')!.props.onSubmit as (e: unknown) => void)({ preventDefault() {} });
const change = (value: string) =>
  (render().find((n) => n.props.id === 'first-project-name')!.props.onChange as (e: unknown) => void)({
    currentTarget: { value },
  });
beforeEach(() => {
  jest.clearAllMocks();
  mockStates = [];
  mockRefs = [];
  mockUser = null;
  mockTrackHeaderEffects = false;
  mockHeaderDeps = undefined;
  mockReadAccount.mockResolvedValue({
    data: {
      user: {
        id: 'owner',
        name: 'Owner',
        email: 'owner@example.test',
        currentProjectId: 'project',
        currentProject: { id: 'project', name: 'Personal' },
        timezone: 'Pacific/Honolulu',
        weekStartDay: 'MONDAY',
        dailyCapacityMinutes: null,
      },
    },
  });
});
it('retains the same submitted identity and name after an uncertain outcome; blocks duplicate clicks', () => {
  change('  Personal work  ');
  submit();
  submit();
  expect(mockExecute).toHaveBeenCalledTimes(1);
  const first = mockExecute.mock.calls[0][0];
  expect(first).toEqual({ projectId: expect.stringMatching(/^[\da-f-]{36}$/), name: 'Personal work' });
  mockCallbacks.onSuccess({ data: { ok: false, error: { retryable: true, message: 'Retry' } } });
  mockCallbacks.onSettled();
  const input = render().find((n) => n.props.id === 'first-project-name')!;
  expect(input.props.value).toBe('  Personal work  ');
  expect(input.props.disabled).toBe(true);
  submit();
  expect(mockExecute.mock.calls[1][0]).toEqual(first);
  expect(saved).not.toHaveBeenCalled();
});
it('does not claim success for a conflict; retains draft and forwards only owner canonical data', () => {
  change('Keep this draft');
  submit();
  mockCallbacks.onSuccess({
    data: {
      ok: false,
      error: { retryable: false, message: 'Conflict' },
      canonical: { projectId: 'saved', today: { revision: 2 } },
    },
  });
  mockCallbacks.onSettled();
  expect(saved).not.toHaveBeenCalled();
  expect(canonical).toHaveBeenCalledWith({ revision: 2 });
  expect(render().find((n) => n.props.id === 'first-project-name')!.props.value).toBe('Keep this draft');
});
it('reveals saved project controls only for a confirmed result', () => {
  change('Personal');
  submit();
  const data = { projectId: 'saved', today: { revision: 1, projects: [{ id: 'saved', name: 'Personal' }] } };
  mockCallbacks.onSuccess({ data: { ok: true, data } });
  expect(saved).toHaveBeenCalledWith(data);
});

it('retains the original project identity when creation succeeds but account readback cannot be confirmed', async () => {
  saved.mockRejectedValueOnce(new Error('Account read unavailable'));
  change('Personal');
  submit();
  const original = mockExecute.mock.calls[0][0];
  await mockCallbacks.onSuccess({ data: { ok: true, data: { projectId: original.projectId, today: {} } } });
  mockCallbacks.onSettled();
  expect(render().find((node) => node.props.id === 'first-project-name')!.props.disabled).toBe(true);
  submit();
  expect(mockExecute.mock.calls[1][0]).toEqual(original);
});

it('mounts task creation on the confirmed canonical snapshot rather than the empty initial snapshot', async () => {
  const empty: TodayViewModel = {
    backlog: [],
    carryover: [],
    focus: null,
    generatedAt: '2026-10-04T00:30:00Z',
    items: [],
    planDate: '2026-10-03',
    projects: [],
    revision: 0,
    runningIndicators: [],
    summary: { actualSeconds: 0, cancelledCount: 0, completedCount: 0, openCount: 0, totalCount: 0 },
    timezone: 'Pacific/Honolulu',
    workload: {
      actualSeconds: 0,
      capacityMinutes: null,
      plannedMinutes: 0,
      remainingMinutes: null,
      state: 'unset',
      utilizationPercent: null,
    },
  };
  const profile: AccountProfile = {
    id: 'owner',
    name: 'Owner',
    email: 'owner@example.test',
    currentProjectId: null,
    currentProject: null,
    timezone: 'Pacific/Honolulu',
    weekStartDay: 'MONDAY',
    dailyCapacityMinutes: null,
  };
  const props = {
    initialToday: empty,
    profile,
    firstUse: { activeProjectCount: 0, archivedProjectCount: 0, taskCount: 0 },
  };
  const renderGuide = () => {
    mockStateIndex = mockRefIndex = 0;
    return children(FirstUseToday(props));
  };
  const first = renderGuide();
  expect(first.find((n) => n.type === TodayCockpit)).toBeUndefined();
  const savedToday = { ...empty, revision: 1, projects: [{ id: 'project', name: 'Personal' }] };
  const parentFrame = { states: mockStates, refs: mockRefs };
  const headerFrame = { states: [] as unknown[], refs: [] as { current: unknown }[] };
  const header = () => {
    mockStates = headerFrame.states;
    mockRefs = headerFrame.refs;
    mockStateIndex = mockRefIndex = 0;
    mockTrackHeaderEffects = true;
    const tree = children(ProjectSwitcher());
    mockTrackHeaderEffects = false;
    return tree;
  };
  header();
  expect(mockExecute).toHaveBeenCalledTimes(1);
  mockStates = parentFrame.states;
  mockRefs = parentFrame.refs;
  await (first.find((n) => n.type === FirstProjectForm)!.props.onSaved as (data: unknown) => Promise<void>)({
    projectId: 'project',
    today: savedToday,
  });
  const next = renderGuide().find((n) => n.type === TodayCockpit)!;
  expect(next.props.initialToday).toEqual(savedToday);
  expect(next.props.focusTaskCreation).toBe(true);
  expect((next.props.canonicalSetup as { profile: AccountProfile }).profile).toMatchObject({
    currentProjectId: 'project',
    currentProject: { id: 'project', name: 'Personal' },
  });
  expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ currentProjectId: 'project' }));
  const refreshedHeader = header();
  expect(mockExecute).toHaveBeenCalledTimes(2);
  expect(refreshedHeader.some((node) => node.props.children === 'Personal')).toBe(true);
});
