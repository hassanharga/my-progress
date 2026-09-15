import { restoreOverlayFocus } from '@/components/shared/overlay-focus';

describe('restoreOverlayFocus', () => {
  it('returns focus to the captured opener after the overlay unmounts', () => {
    const focus = jest.fn();
    const schedule = jest.fn((callback: () => void) => callback());

    restoreOverlayFocus({ focus }, schedule);

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no opener was captured', () => {
    const schedule = jest.fn();

    restoreOverlayFocus(null, schedule);

    expect(schedule).not.toHaveBeenCalled();
  });
});
