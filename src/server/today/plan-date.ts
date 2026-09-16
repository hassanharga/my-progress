export type PlanDate = {
  date: Date;
  key: string;
};

export type PlanDateBoundary = {
  end: Date;
  key: string;
  start: Date;
};

const PLAN_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parsePlanDateKey = (key: string): PlanDate => {
  if (!PLAN_DATE_PATTERN.test(key)) {
    throw new RangeError('Plan date must use YYYY-MM-DD');
  }

  const date = new Date(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== key) {
    throw new RangeError('Plan date is not a real calendar date');
  }

  return { date, key };
};

export const derivePlanDate = (now: Date, timezone: string): PlanDate => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return parsePlanDateKey(`${values.year}-${values.month}-${values.day}`);
};

const timezoneOffsetMilliseconds = (instant: Date, timezone: string): number => {
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

const localMidnightToUtc = (date: Date, timezone: string): Date => {
  const desiredWallTime = date.getTime();
  let candidate = desiredWallTime;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const adjusted = desiredWallTime - timezoneOffsetMilliseconds(new Date(candidate), timezone);
    if (adjusted === candidate) break;
    candidate = adjusted;
  }

  return new Date(candidate);
};

export const getPlanDateBoundary = (key: string, timezone: string): PlanDateBoundary => {
  const { date } = parsePlanDateKey(key);
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return {
    end: localMidnightToUtc(nextDate, timezone),
    key,
    start: localMidnightToUtc(date, timezone),
  };
};
