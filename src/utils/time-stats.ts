export type WeekStartDay = 'SUNDAY' | 'MONDAY' | 'SATURDAY';

/** Maps a WeekStartDay to date-fns `weekStartsOn` (0 = Sunday ... 6 = Saturday). */
export const WEEK_STARTS_ON: Record<WeekStartDay, 0 | 1 | 6> = {
  SUNDAY: 0,
  MONDAY: 1,
  SATURDAY: 6,
};

/** Formats a duration given in seconds as the compact "Xh Ym" / "Ym" used across the app. */
export const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};
