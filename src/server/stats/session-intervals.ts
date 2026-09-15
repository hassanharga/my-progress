export type SessionInterval = {
  startedAt: Date;
  endedAt: Date | null;
};

export type IntervalBoundary = {
  start: Date;
  end: Date;
  now: Date;
};

export type ClippedSessionInterval = {
  start: Date;
  end: Date;
};

export type SessionIntervalSummary = {
  trackedSeconds: number;
  uniqueWorkingSeconds: number;
};

export const clipSessionInterval = (
  interval: SessionInterval,
  boundary: IntervalBoundary
): ClippedSessionInterval | null => {
  const startedAt = interval.startedAt.getTime();
  const naturalEnd = (interval.endedAt ?? boundary.now).getTime();
  const periodStart = boundary.start.getTime();
  const periodEnd = Math.min(boundary.end.getTime(), boundary.now.getTime());

  if (![startedAt, naturalEnd, periodStart, periodEnd].every(Number.isFinite)) return null;
  if (naturalEnd <= startedAt || periodEnd <= periodStart) return null;

  const clippedStart = Math.max(startedAt, periodStart);
  const clippedEnd = Math.min(naturalEnd, periodEnd);
  if (clippedEnd <= clippedStart) return null;

  return { end: new Date(clippedEnd), start: new Date(clippedStart) };
};

export const summarizeSessionIntervals = (
  intervals: SessionInterval[],
  boundary: IntervalBoundary
): SessionIntervalSummary => {
  const clipped = intervals
    .map((interval) => clipSessionInterval(interval, boundary))
    .filter((interval): interval is ClippedSessionInterval => interval !== null)
    .map(({ end, start }) => ({ end: end.getTime(), start: start.getTime() }))
    .sort((left, right) => left.start - right.start || left.end - right.end);

  const trackedMilliseconds = clipped.reduce((total, interval) => total + interval.end - interval.start, 0);
  let uniqueMilliseconds = 0;
  let mergedStart: number | null = null;
  let mergedEnd: number | null = null;

  for (const interval of clipped) {
    if (mergedStart === null || mergedEnd === null) {
      mergedStart = interval.start;
      mergedEnd = interval.end;
      continue;
    }
    if (interval.start <= mergedEnd) {
      mergedEnd = Math.max(mergedEnd, interval.end);
      continue;
    }
    uniqueMilliseconds += mergedEnd - mergedStart;
    mergedStart = interval.start;
    mergedEnd = interval.end;
  }
  if (mergedStart !== null && mergedEnd !== null) uniqueMilliseconds += mergedEnd - mergedStart;

  return {
    trackedSeconds: trackedMilliseconds / 1000,
    uniqueWorkingSeconds: uniqueMilliseconds / 1000,
  };
};
