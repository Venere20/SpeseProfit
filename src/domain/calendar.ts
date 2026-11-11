import { shiftDate, validateDate } from './ledger';

export function calendarDays(value: string): string[] {
  const first = validateDate(value).slice(0, 7) + '-01';
  const weekday = new Date(first + 'T12:00:00Z').getUTCDay();
  const start = shiftDate(first, -((weekday + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => shiftDate(start, index));
}

export function calendarMonth(value: string, offset: number): string {
  const date = new Date(validateDate(value).slice(0, 7) + '-01T12:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + offset);
  return validateDate(date.toISOString().slice(0, 10));
}

export function displayDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(validateDate(value) + 'T12:00:00Z'));
}

export function displayMonth(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(validateDate(value) + 'T12:00:00Z'));
}

