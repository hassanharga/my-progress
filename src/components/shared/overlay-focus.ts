type FocusTarget = {
  focus: () => void;
};

type FocusScheduler = (callback: () => void) => unknown;

export function restoreOverlayFocus(
  opener: FocusTarget | null,
  schedule: FocusScheduler = requestAnimationFrame
) {
  if (!opener) return;
  schedule(() => opener.focus());
}
