import { differenceInMinutes } from 'date-fns';

import { formatDuration } from '@/utils/time-stats';

export function calculateElapsedTime(dates: { from: Date; to: Date | null }[]) {
  const minutes = dates.reduce((totalMinutes, { from, to }) => {
    const minutesElapsed = differenceInMinutes(to || new Date(), from);
    return totalMinutes + minutesElapsed;
  }, 0);

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return {
    timeFormatted: hours > 0 ? `${hours} hours ${remainingMinutes} minutes` : `${remainingMinutes} minutes`,
    hours,
    minutes: remainingMinutes,
  };
}

/**
 * Computes the display duration for a task using the cached `totalSeconds`
 * plus the active session (if the task is in-progress and has an open session).
 */
export function formatTaskDuration(
  totalSeconds: number,
  activeSessionFrom?: Date | null
): string {
  let seconds = totalSeconds;
  if (activeSessionFrom) {
    seconds += (Date.now() - activeSessionFrom.getTime()) / 1000;
  }
  return formatDuration(seconds);
}
