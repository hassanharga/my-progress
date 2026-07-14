import { formatDuration } from '@/utils/time-stats';

/**
 * Computes the display duration for a task using the cached `totalSeconds`
 * plus the active session (if the task is in-progress and has an open session).
 */
export function formatTaskDuration(totalSeconds: number, activeSessionFrom?: Date | null): string {
  let seconds = totalSeconds;
  if (activeSessionFrom) {
    seconds += (Date.now() - activeSessionFrom.getTime()) / 1000;
  }
  return formatDuration(seconds);
}
