import { format } from 'date-fns';

export const formatDate = (date: Date | string | number, formatString = 'yyyy-MM-dd'): string => {
  const dateObject = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (!(dateObject instanceof Date) || isNaN(dateObject.getTime())) {
    throw new Error('Invalid date');
  }

  return format(date, formatString);
};
