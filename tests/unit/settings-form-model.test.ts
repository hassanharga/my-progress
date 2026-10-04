import PreferencesForm, { parsePreferenceDraft } from '../../src/components/settings/PreferencesForm';
import type { AccountProfile } from '../../src/types/user';

// Runs actual component handlers with a deterministic hook harness; not rendered browser QA.
const mockExecute = jest.fn();
const mockSetUser = jest.fn();
const mockRefetch = jest.fn();
const mockRefresh = jest.fn();
let mockPending = false;
let mockStates: unknown[] = [];
let mockRefs: { current: unknown }[] = [];
let mockStateIndex = 0;
let mockRefIndex = 0;
let mockEffectIndex = 0;
let mockDeps: (unknown[] | undefined)[] = [];
let mockEffects: (() => void)[] = [];
type Callbacks = {
  onSuccess: (args: { data: AccountProfile }) => void;
  onError: (args: { error: { serverError?: string } }) => void;
  onSettled: () => void;
};
let mockCallbacks: Callbacks;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial: unknown) => {
    const index = mockStateIndex++;
    if (!(index in mockStates)) mockStates[index] = typeof initial === 'function' ? initial() : initial;
    return [
      mockStates[index],
      (value: unknown) => {
        mockStates[index] = typeof value === 'function' ? value(mockStates[index]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = mockRefIndex++;
    return mockRefs[index] ?? (mockRefs[index] = { current: initial });
  },
  useEffect: (effect: () => void, deps: unknown[] | undefined) => {
    const index = mockEffectIndex++;
    const previous = mockDeps[index];
    if (!previous || !deps || deps.some((value, offset) => value !== previous[offset])) mockEffects.push(effect);
    mockDeps[index] = deps;
  },
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock('next-safe-action/hooks', () => ({
  useAction: (_action: unknown, callbacks: Callbacks) => {
    mockCallbacks = callbacks;
    return { execute: mockExecute, isPending: mockPending };
  },
}));

jest.mock('../../src/actions/user', () => ({ updateSettings: jest.fn() }));
jest.mock('../../src/contexts/user.context', () => ({
  useUserContext: () => ({ setUserData: mockSetUser, refetchUser: mockRefetch }),
}));

const profile: AccountProfile = {
  id: 'owner',
  name: 'Owner',
  email: 'owner@example.test',
  currentProjectId: null,
  currentProject: null,
  timezone: 'Africa/Cairo',
  weekStartDay: 'MONDAY',
  dailyCapacityMinutes: null,
};
beforeEach(() => {
  jest.clearAllMocks();
  mockPending = false;
  mockStates = [];
  mockRefs = [];
  mockStateIndex = 0;
  mockRefIndex = 0;
  mockEffectIndex = 0;
  mockDeps = [];
  mockEffects = [];
  mockExecute.mockImplementation(() => {
    mockPending = true;
  });
});
const renderForm = (initial = profile) => {
  mockStateIndex = 0;
  mockRefIndex = 0;
  mockEffectIndex = 0;
  return PreferencesForm({ profile: initial });
};
const findProps = (
  node: unknown,
  predicate: (props: Record<string, unknown>) => boolean
): Record<string, unknown> | undefined => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProps(child, predicate);
      if (found) return found;
    }
  } else if (node && typeof node === 'object' && 'props' in node) {
    const props = node.props as Record<string, unknown>;
    return predicate(props) ? props : findProps(props.children, predicate);
  }
};
const change = (form: unknown, id: string, value: string) => {
  const control = findProps(form, (props) => props.id === id)!;
  (control.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
};
const submit = (form: ReturnType<typeof renderForm>) => {
  (form.props as { onSubmit: (event: { preventDefault: () => void }) => void }).onSubmit({ preventDefault: jest.fn() });
};
const flushEffects = () => {
  const effects = mockEffects;
  mockEffects = [];
  effects.forEach((effect) => effect());
};

it('guards duplicate submission and sends one complete explicit patch', () => {
  let form = renderForm();
  change(form, 'dailyCapacityMinutes', '0');
  form = renderForm();
  submit(form);
  submit(form);
  expect(mockExecute).toHaveBeenCalledTimes(1);
  expect(mockExecute).toHaveBeenCalledWith({
    timezone: 'Africa/Cairo',
    weekStartDay: 'MONDAY',
    dailyCapacityMinutes: 0,
  });
  form = renderForm();
  expect(form.props['aria-busy']).toBe(true);
  expect(findProps(form, (props) => props.disabled === true)).toBeDefined();
});
it('retains drafts and focuses a retryable summary after a failed save', () => {
  let form = renderForm();
  change(form, 'timezone', 'Pacific/Honolulu');
  form = renderForm();
  submit(form);
  mockCallbacks.onError({ error: { serverError: 'Unable to save preferences. Please try again.' } });
  mockPending = false;
  mockCallbacks.onSettled();
  form = renderForm();
  expect(findProps(form, (props) => props.id === 'timezone')?.value).toBe('Pacific/Honolulu');
  const focus = jest.fn();
  const summary = findProps(form, (props) => props.role === 'alert')!;
  (summary.ref as { current: unknown }).current = { focus };
  flushEffects();
  expect(focus).toHaveBeenCalledTimes(1);
  expect(mockRefresh).not.toHaveBeenCalled();
  change(form, 'dailyCapacityMinutes', '10');
  renderForm();
  flushEffects();
  expect(focus).toHaveBeenCalledTimes(1);
  submit(renderForm());
  expect(mockExecute).toHaveBeenCalledTimes(2);
});
it('stores the authoritative result, refreshes consumers and restores Save focus after settlement', () => {
  const canonical = { ...profile, timezone: 'Pacific/Honolulu', dailyCapacityMinutes: 120 };
  submit(renderForm());
  mockCallbacks.onSuccess({ data: canonical });
  expect(mockSetUser).toHaveBeenCalledWith(canonical);
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  mockPending = false;
  mockCallbacks.onSettled();
  const form = renderForm(canonical);
  expect(findProps(form, (props) => props.id === 'timezone')?.value).toBe(canonical.timezone);
  expect(findProps(form, (props) => props.id === 'dailyCapacityMinutes')?.value).toBe('120');
  const save = findProps(form, (props) => props.type === 'submit')!;
  const focus = jest.fn();
  (save.ref as { current: unknown }).current = { focus };
  flushEffects();
  expect(focus).toHaveBeenCalledTimes(1);
  expect(findProps(form, (props) => props.role === 'status')?.children).toBe('Preferences saved.');
});
it.each([
  ['', null],
  ['0', 0],
  ['1440', 1440],
] as const)('maps capacity %s without losing zero', (capacity, expected) => {
  expect(parsePreferenceDraft({ timezone: 'Africa/Cairo', weekStartDay: 'MONDAY', capacity })).toEqual({
    timezone: 'Africa/Cairo',
    weekStartDay: 'MONDAY',
    dailyCapacityMinutes: expected,
  });
});
it.each(['-1', '0.5', '1441', 'abc'])('rejects capacity %s', (capacity) => {
  expect(() => parsePreferenceDraft({ timezone: 'UTC', weekStartDay: 'SUNDAY', capacity })).toThrow();
});
it('does not silently replace an invalid timezone', () => {
  expect(() => parsePreferenceDraft({ timezone: 'Invalid/Zone', weekStartDay: 'MONDAY', capacity: '' })).toThrow();
});
