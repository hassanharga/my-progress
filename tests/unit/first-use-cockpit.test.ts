import type { ReactElement } from 'react';

import { createInlineTaskDraft, InlineTaskForm, InlineTaskFormFields } from '../../src/components/today/InlineTaskForm';
import { TodayCockpit, type TodayCockpitProps } from '../../src/components/today/TodayCockpit';
import type { TodayViewModel } from '../../src/server/today/today-types';
import type { AccountProfile } from '../../src/types/user';

const mockSave = jest.fn();
const mockCreate = jest.fn();
let mockStates: unknown[] = [];
let mockRefs: { current: unknown }[] = [];
let mockIndex = 0;
let mockRefIndex = 0;
let mockEffects: (() => void)[] = [];
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void) => {
    mockEffects.push(effect);
  },
  useState: (initial: unknown) => {
    const i = mockIndex++;
    const store = mockStates;
    if (!(i in mockStates)) mockStates[i] = typeof initial === 'function' ? initial() : initial;
    return [
      mockStates[i],
      (v: unknown) => {
        store[i] = typeof v === 'function' ? v(store[i]) : v;
      },
    ];
  },
  useReducer: (
    reducer: (state: unknown, action: unknown) => unknown,
    initial: unknown,
    init: (value: unknown) => unknown
  ) => {
    const i = mockIndex++;
    const store = mockStates;
    if (!(i in mockStates)) mockStates[i] = init(initial);
    return [
      mockStates[i],
      (action: unknown) => {
        store[i] = reducer(store[i], action);
      },
    ];
  },
  useRef: (initial: unknown) => {
    const i = mockRefIndex++;
    return mockRefs[i] ?? (mockRefs[i] = { current: initial });
  },
}));
jest.mock('../../src/actions/today', () => ({
  createTodayTask: 'create',
  mutateToday: 'mutate',
  transitionTodayTask: 'transition',
}));
jest.mock('../../src/actions/user', () => ({ saveFirstUseTimezone: 'timezone' }));
jest.mock('next-safe-action/hooks', () => ({
  useAction: (action: string) => ({
    executeAsync: action === 'timezone' ? mockSave : action === 'create' ? mockCreate : jest.fn(),
  }),
}));
const profile: AccountProfile = {
  id: 'owner',
  name: 'Owner',
  email: 'owner@example.test',
  currentProjectId: 'project',
  currentProject: { id: 'project', name: 'Personal' },
  timezone: 'UTC',
  weekStartDay: 'MONDAY',
  dailyCapacityMinutes: null,
};
const initial: TodayViewModel = {
  backlog: [],
  carryover: [],
  focus: null,
  generatedAt: '2026-10-04T00:30:00Z',
  items: [],
  planDate: '2026-10-04',
  projects: [{ id: 'project', name: 'Personal' }],
  revision: 0,
  runningIndicators: [],
  summary: { actualSeconds: 0, cancelledCount: 0, completedCount: 0, openCount: 0, totalCount: 0 },
  timezone: 'UTC',
  workload: {
    actualSeconds: 0,
    capacityMinutes: null,
    plannedMinutes: 0,
    remainingMinutes: null,
    state: 'unset',
    utilizationPercent: null,
  },
};
const next = {
  ...initial,
  revision: 1,
  timezone: 'Pacific/Honolulu',
  planDate: '2026-10-03',
  workload: { ...initial.workload, capacityMinutes: 0 },
};
const nextProfile = { ...profile, timezone: 'Pacific/Honolulu', dailyCapacityMinutes: 0 };
const nodes = (value: unknown): ReactElement<Record<string, unknown>>[] => {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as ReactElement<Record<string, unknown>>;
  return [node, ...nodes(node.props.children)];
};
const render = (overrides: Partial<TodayCockpitProps> = {}) => {
  mockIndex = mockRefIndex = 0;
  mockEffects = [];
  const tree = nodes(TodayCockpit({ initialToday: initial, setupProfile: profile, ...overrides }));
  mockEffects.forEach((effect) => effect());
  return tree;
};
const actions = () =>
  render()[0].props.value as {
    createTask: (input: unknown) => Promise<unknown>;
    today: TodayViewModel;
    profile: AccountProfile;
  };
const save = () =>
  render().find((n) => typeof n.props.onSave === 'function')!.props.onSave as (
    zone: string
  ) => Promise<{ ok: boolean }>;
beforeEach(() => {
  jest.clearAllMocks();
  mockStates = [];
  mockRefs = [];
  mockEffects = [];
  mockSave.mockResolvedValue({ data: { ok: true, data: { profile: nextProfile, today: next } } });
  mockCreate.mockResolvedValue({ data: { ok: true, data: next } });
});
it('settles the near-midnight canonical profile and Today together and creates an unsent draft on its new date', async () => {
  const draft = {
    ...createInlineTaskDraft(),
    title: 'Keep this title',
    description: 'Keep this description',
    projectId: 'project',
  };
  expect(await save()('Pacific/Honolulu')).toMatchObject({ ok: true });
  expect(actions().today).toMatchObject({
    timezone: 'Pacific/Honolulu',
    planDate: '2026-10-03',
    workload: { capacityMinutes: 0 },
  });
  expect(actions().profile).toEqual(nextProfile);
  expect(draft.title).toBe('Keep this title');
  await actions().createTask({ ...draft, planDate: actions().today.planDate, requestId: 'receipt' });
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ planDate: '2026-10-03', title: 'Keep this title' })
  );
});
it('blocks task mutation after uncertain timezone save until the same explicit save is reconciled', async () => {
  mockSave.mockResolvedValueOnce({
    data: { ok: false, error: { code: 'CONFLICT', message: 'Retry', retryable: true } },
  });
  expect(await save()('Pacific/Honolulu')).toMatchObject({ ok: false });
  await actions().createTask({ planDate: initial.planDate });
  expect(mockCreate).not.toHaveBeenCalled();
  expect(await save()('Pacific/Honolulu')).toMatchObject({ ok: true });
  await actions().createTask({ planDate: next.planDate });
  expect(mockCreate).toHaveBeenCalledTimes(1);
});
it('defers timezone changes while a task receipt is pending or its result is uncertain', async () => {
  let finish!: (value: unknown) => void;
  mockCreate.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = actions().createTask({ planDate: initial.planDate, requestId: 'keep-receipt' });
  expect(await save()('Pacific/Honolulu')).toMatchObject({ ok: false });
  expect(mockSave).not.toHaveBeenCalled();
  finish({ serverError: 'Unconfirmed' });
  await pending;
  expect(await save()('Pacific/Honolulu')).toMatchObject({ ok: false });
  expect(mockSave).not.toHaveBeenCalled();
  const retryTimezone = save();
  await actions().createTask({ planDate: initial.planDate, requestId: 'keep-receipt' });
  expect(await retryTimezone('Pacific/Honolulu')).toMatchObject({ ok: true });
});

it('retries an uncertain task with its exact original receipt, date and draft rather than a newly supplied date', async () => {
  const onCreate = jest
    .fn()
    .mockResolvedValueOnce({ ok: false, preserveInput: true, error: { retryable: true, message: 'Retry' } })
    .mockResolvedValueOnce({ ok: true, preserveInput: false });
  let planDate = '2026-10-04';
  const form = () => {
    mockIndex = mockRefIndex = 0;
    return nodes(InlineTaskForm({ planDate, projects: initial.projects, onCreate }));
  };
  const fields = () => form().find((n) => n.type === InlineTaskFormFields)!;
  (fields().props.onChange as (draft: unknown) => void)({
    ...createInlineTaskDraft(),
    title: 'Keep title',
    description: 'Keep description',
    projectId: 'project',
  });
  const submit = async () => {
    const node = form().find((n) => n.type === 'form')!;
    await (node.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault() {} });
  };
  await submit();
  const firstPayload = onCreate.mock.calls[0][0];
  expect(firstPayload).toMatchObject({
    planDate: '2026-10-04',
    title: 'Keep title',
    description: 'Keep description',
    startNow: false,
  });
  expect(fields().props.pending).toBe(true);
  planDate = '2026-10-03';
  await submit();
  expect(onCreate.mock.calls[1][0]).toEqual(firstPayload);
});

it('reconciles the already-mounted archived-only cockpit to the saved first project without replaying it after later mutations', async () => {
  const old = { ...initial, projects: [], revision: 0 };
  const oldPair = { today: old, profile };
  render({ initialToday: old, canonicalSetup: oldPair });
  const savedPair = { today: next, profile: nextProfile };
  render({ initialToday: old, canonicalSetup: savedPair });
  const applied = render({ initialToday: old, canonicalSetup: savedPair })[0].props.value as {
    today: TodayViewModel;
    profile: AccountProfile;
    createTask: (input: unknown) => Promise<unknown>;
  };
  expect(applied.today.projects).toEqual([{ id: 'project', name: 'Personal' }]);
  expect(applied.today.planDate).toBe('2026-10-03');
  expect(applied.profile).toEqual(nextProfile);
  mockCreate.mockResolvedValueOnce({ data: { ok: true, data: { ...next, revision: 2 } } });
  await applied.createTask({ planDate: next.planDate, requestId: 'receipt' });
  render({ canonicalSetup: savedPair });
  expect((render({ canonicalSetup: savedPair })[0].props.value as { today: TodayViewModel }).today.revision).toBe(2);
});

it('rejects an older timezone result without replacing the current profile/date or enabling task creation', async () => {
  render({ initialToday: { ...initial, revision: 2 } });
  expect(await save()('Pacific/Honolulu')).toMatchObject({ ok: false });
  expect(actions().today).toMatchObject({ revision: 2, planDate: '2026-10-04', timezone: 'UTC' });
  expect(actions().profile).toEqual(profile);
  await actions().createTask({ planDate: initial.planDate });
  expect(mockCreate).not.toHaveBeenCalled();
});

it('waits for the canonical project before focusing task creation in an already-mounted form', () => {
  const focus = jest.fn();
  const renderForm = (projects: TodayViewModel['projects'], disabled = false) => {
    mockIndex = mockRefIndex = 0;
    mockEffects = [];
    const tree = nodes(
      InlineTaskForm({ planDate: initial.planDate, projects, disabled, onCreate: jest.fn(), focusOnMount: true })
    );
    const opener = tree.find((node) => node.props.children === 'Create task')!;
    (opener.props.ref as { current: unknown }).current = { focus };
    mockEffects.forEach((effect) => effect());
  };
  renderForm([]);
  expect(focus).not.toHaveBeenCalled();
  renderForm(initial.projects);
  expect(focus).toHaveBeenCalledTimes(1);
  renderForm(initial.projects, true);
  renderForm(initial.projects, false);
  expect(focus).toHaveBeenCalledTimes(1);
});

it('preserves the mounted unsent task draft through timezone settlement, updates safe account context, and submits on the new date', async () => {
  const cockpitFrame = { states: mockStates, refs: mockRefs };
  const formFrame = { states: [] as unknown[], refs: [] as { current: unknown }[] };
  const appliedProfile = jest.fn();
  const cockpit = () => {
    mockStates = cockpitFrame.states;
    mockRefs = cockpitFrame.refs;
    return render({ onProfileApplied: appliedProfile });
  };
  const form = (planDate: string) => {
    const createTask = (cockpit()[0].props.value as { createTask: (input: unknown) => Promise<never> }).createTask;
    mockStates = formFrame.states;
    mockRefs = formFrame.refs;
    mockIndex = mockRefIndex = 0;
    mockEffects = [];
    return nodes(InlineTaskForm({ planDate, projects: initial.projects, onCreate: createTask }));
  };
  const first = form(initial.planDate).find((node) => node.type === InlineTaskFormFields)!;
  (first.props.onChange as (draft: unknown) => void)({
    ...createInlineTaskDraft(),
    title: 'Typed but unsent',
    description: 'Keep this actual form state',
    projectId: 'project',
  });
  const guide = cockpit().find((node) => typeof node.props.onSave === 'function')!;
  await (guide.props.onSave as (zone: string) => Promise<unknown>)('Pacific/Honolulu');
  const current = cockpit()[0].props.value as { today: TodayViewModel };
  expect(appliedProfile).toHaveBeenLastCalledWith(nextProfile);
  const nextForm = form(current.today.planDate);
  expect(nextForm.find((node) => node.type === InlineTaskFormFields)!.props.draft).toMatchObject({
    title: 'Typed but unsent',
    description: 'Keep this actual form state',
    requestId: null,
  });
  await (nextForm.find((node) => node.type === 'form')!.props.onSubmit as (event: unknown) => Promise<void>)({
    preventDefault() {},
  });
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Typed but unsent',
      description: 'Keep this actual form state',
      planDate: '2026-10-03',
      startNow: false,
    })
  );
});

it('does not replay the old profile when the account-context callback identity changes', () => {
  const initialCallback = jest.fn();
  render({ onProfileApplied: initialCallback });
  expect(initialCallback).toHaveBeenCalledWith(profile);
  const refreshedCallback = jest.fn();
  render({ onProfileApplied: refreshedCallback });
  expect(refreshedCallback).not.toHaveBeenCalled();
});
