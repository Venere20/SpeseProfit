import { LedgerState } from './model';
import { calendarDays } from './calendar';
import { isRefund, romeDate, shiftDate, summary, validateDate, weekOf } from './ledger';

export const MIN_MONTH = '0001-01';
export const MAX_MONTH = '9998-12';
export function monthStart(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month) || month < MIN_MONTH || month > MAX_MONTH) throw new Error('Mese non valido.');
  return validateDate(`${month}-01`);
}
export function shiftMonth(month: string, offset: number): string {
  if (!Number.isSafeInteger(offset)) throw new Error('Spostamento del mese non valido.');
  const date = new Date(`${monthStart(month)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const result = date.toISOString().slice(0, 7);
  monthStart(result);
  return result;
}
export function monthEnd(month: string): string {
  const date = new Date(`${monthStart(month)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return validateDate(date.toISOString().slice(0, 10));
}
export function monthlySummary(state: LedgerState, month: string, now = new Date(), throughDay?: number) {
  const first = monthStart(month);
  if (throughDay !== undefined && (!Number.isSafeInteger(throughDay) || throughDay < 1 || throughDay > 31)) throw new Error('Giorno finale non valido.');
  const last = monthEnd(month);
  const throughDate = throughDay === undefined ? last : `${month}-${String(Math.min(throughDay, Number(last.slice(8)))).padStart(2, '0')}`;
  const currentWeek = weekOf(romeDate(now));
  let monday = weekOf(first);
  if (monday < first) monday = shiftDate(monday, 7);
  const weeks: { weekStart: string; cashIncome: number; entered: boolean; started: boolean }[] = [];
  while (monday.slice(0, 7) === month && monday <= throughDate) {
    weeks.push({ weekStart: monday, cashIncome: state.cashIncome[monday] ?? 0,
      entered: Object.hasOwn(state.cashIncome, monday), started: monday <= currentWeek });
    monday = shiftDate(monday, 7);
  }
  // A weekly total cannot be split into daily receipts: assign it once, to its Monday's month.
  const cashIncome = weeks.reduce((sum, week) => sum + week.cashIncome, 0);
  const missingWeeks = weeks.filter(week => week.started && !week.entered).map(week => week.weekStart);
  let otherIncome = 0; let expenses = 0; let refunds = 0;
  const categories = new Map<string, number>();
  for (const transaction of state.transactions) {
    if (transaction.date.slice(0, 7) !== month || transaction.date > throughDate || transaction.classification !== 'included') continue;
    if (isRefund(transaction)) refunds += transaction.cents;
    else if (transaction.cents >= 0) { if (!(transaction.bankEvent && Object.hasOwn(state.cashIncome,weekOf(transaction.date)))) otherIncome += transaction.cents; }
    else {
      expenses -= transaction.cents;
      categories.set(transaction.categoryId, (categories.get(transaction.categoryId) ?? 0) - transaction.cents);
    }
  }
  const income = cashIncome + otherIncome;
  return { month, throughDate, cashIncome, otherIncome, income, expenses, refunds, balance: income + refunds - expenses,
    weeks, missingWeeks,
    categoryExpenses: [...categories].map(([categoryId, cents]) => ({ categoryId, cents, share: cents / expenses })).sort((a, b) => b.cents - a.cents || a.categoryId.localeCompare(b.categoryId)) };
}

export type WeeklyClosure = 'positive' | 'negative' | 'even' | 'incomplete' | 'ongoing' | 'future';
export function monthlyCalendar(state: LedgerState, month: string, now = new Date()) {
  const days = calendarDays(monthStart(month));
  const today = romeDate(now);
  const rows = [];
  for (let index = 0; index < days.length; index += 7) {
    const row = days.slice(index, index + 7);
    if (!row.some(day => day.slice(0, 7) === month)) continue;
    const weekStart = row[0]!;
    const weekEnd = row[6]!;
    const total = summary(state, weekStart);
    const closure: WeeklyClosure = weekStart > today ? 'future' : weekEnd >= today ? 'ongoing'
      : !total.hasCashIncome ? 'incomplete' : total.balanceState as 'positive' | 'negative' | 'even';
    rows.push({ weekStart, weekEnd, days: row, closure, total });
  }
  return rows;
}
