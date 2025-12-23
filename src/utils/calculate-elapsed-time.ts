import { differenceInMinutes } from 'date-fns';

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
