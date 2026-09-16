import { isTransitionSerializationError, runTodayTransitionWithRetry } from '../../src/server/tasks/transition-task';
import { runTodayMutationWithRetry } from '../../src/server/today/mutate-today';

describe('runTodayMutationWithRetry', () => {
  it('retries one serialization failure and returns the successful mutation', async () => {
    const execute = jest
      .fn()
      .mockRejectedValueOnce({ code: '40P01' })
      .mockResolvedValue({ data: { planDate: '2026-09-15' }, ok: true });
    const reconcile = jest.fn();

    await expect(runTodayMutationWithRetry({ execute, reconcile })).resolves.toEqual({
      data: { planDate: '2026-09-15' },
      ok: true,
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('returns a canonical conflict after retry exhaustion', async () => {
    const canonical = { planDate: '2026-09-15' };
    const execute = jest.fn().mockRejectedValue({ code: '40001' });
    const reconcile = jest.fn().mockResolvedValue({
      canonical,
      error: { code: 'CONFLICT', message: 'retry', retryable: true },
      ok: false,
    });

    await expect(runTodayMutationWithRetry({ execute, reconcile })).resolves.toEqual({
      canonical,
      error: { code: 'CONFLICT', message: 'retry', retryable: true },
      ok: false,
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it('does not retry a non-serialization failure', async () => {
    const execute = jest.fn().mockRejectedValue({ code: 'XX000' });
    const reconcile = jest.fn();

    await expect(runTodayMutationWithRetry({ execute, reconcile })).rejects.toMatchObject({ code: 'XX000' });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('recognizes adapter metadata and retries cockpit serialization with the unchanged expectation', async () => {
    expect(
      isTransitionSerializationError({
        code: 'P2028',
        meta: { driverAdapterError: { cause: { originalCode: '40P01' } } },
      })
    ).toBe(true);
    let expectedOpenTaskId: string | null = 'winner-task';
    const observedExpectations: Array<string | null> = [];
    const execute = jest.fn().mockImplementation(async () => {
      observedExpectations.push(expectedOpenTaskId);
      if (observedExpectations.length === 1) throw { code: '40001' };
      return { data: canonical, ok: true };
    });
    const canonical = { planDate: '2026-09-15' };
    const reconcile = jest.fn();

    await expect(runTodayTransitionWithRetry({ execute, reconcile })).resolves.toEqual({ data: canonical, ok: true });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(observedExpectations).toEqual(['winner-task', 'winner-task']);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('reconciles a cockpit canonical model after two serialization failures', async () => {
    const execute = jest.fn().mockRejectedValue({ code: '40P01' });
    const canonical = { planDate: '2026-09-15', items: [{ taskId: 'winner-task' }] };
    const reconcile = jest.fn().mockResolvedValue({
      canonical,
      error: { code: 'CONFLICT', message: 'retry', retryable: true },
      ok: false,
    });

    await expect(runTodayTransitionWithRetry({ execute, reconcile })).resolves.toEqual({
      canonical,
      error: { code: 'CONFLICT', message: 'retry', retryable: true },
      ok: false,
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });
});
