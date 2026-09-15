export type WeekStartDay = 'SUNDAY' | 'MONDAY' | 'SATURDAY';

/** Maps a WeekStartDay to date-fns `weekStartsOn` (0 = Sunday ... 6 = Saturday). */
export const WEEK_STARTS_ON: Record<WeekStartDay, 0 | 1 | 6> = {
  SUNDAY: 0,
  MONDAY: 1,
  SATURDAY: 6,
};

export type TimePeriodBoundary = {
  start: Date;
  end: Date;
  key: string;
};

export type UserPeriodBoundaries = {
  day: TimePeriodBoundary;
  week: TimePeriodBoundary;
  month: TimePeriodBoundary;
};

type CalendarDate = { day: number; month: number; year: number };

const calendarKey = ({ day, month, year }: CalendarDate): string =>
  `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

const addCalendarDays = (date: CalendarDate, days: number): CalendarDate => {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { day: value.getUTCDate(), month: value.getUTCMonth() + 1, year: value.getUTCFullYear() };
};

const getCalendarDate = (instant: Date, timezone: string): CalendarDate => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { day: Number(values.day), month: Number(values.month), year: Number(values.year) };
};

const getTimezoneOffsetMilliseconds = (instant: Date, timezone: string): number => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return representedAsUtc - (instant.getTime() - instant.getMilliseconds());
};

const localMidnightToUtc = (date: CalendarDate, timezone: string): Date => {
  const desiredWallTime = Date.UTC(date.year, date.month - 1, date.day);
  let candidate = desiredWallTime;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const adjusted = desiredWallTime - getTimezoneOffsetMilliseconds(new Date(candidate), timezone);
    if (adjusted === candidate) break;
    candidate = adjusted;
  }

  return new Date(candidate);
};

const boundaryFromDates = (start: CalendarDate, end: CalendarDate, timezone: string): TimePeriodBoundary => ({
  end: localMidnightToUtc(end, timezone),
  key: calendarKey(start),
  start: localMidnightToUtc(start, timezone),
});

export const getUserPeriodBoundaries = (
  now: Date,
  timezone: string,
  weekStartDay: WeekStartDay
): UserPeriodBoundaries => {
  const today = getCalendarDate(now, timezone);
  const calendarDay = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
  const weekOffset = (calendarDay - WEEK_STARTS_ON[weekStartDay] + 7) % 7;
  const weekStart = addCalendarDays(today, -weekOffset);
  const monthStart = { day: 1, month: today.month, year: today.year };
  const nextMonth = new Date(Date.UTC(today.year, today.month, 1));

  return {
    day: boundaryFromDates(today, addCalendarDays(today, 1), timezone),
    month: boundaryFromDates(
      monthStart,
      { day: 1, month: nextMonth.getUTCMonth() + 1, year: nextMonth.getUTCFullYear() },
      timezone
    ),
    week: boundaryFromDates(weekStart, addCalendarDays(weekStart, 7), timezone),
  };
};

/** Formats a duration given in seconds as the compact "Xh Ym" / "Ym" used across the app. */
export const formatDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};
