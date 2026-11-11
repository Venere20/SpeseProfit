import { LedgerState } from './model';
import { romeDate } from './ledger';
import { monthEnd, monthlySummary, monthStart } from './monthly';

export function annualSummary(state: LedgerState, year: number, now = new Date()) {
  if (!Number.isSafeInteger(year) || year < 1 || year > 9998) throw new Error('Anno non valido.');
  const currentMonth = romeDate(now).slice(0, 7);
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`;
    const total = monthlySummary(state, month, now);
    const future = month > currentMonth;
    const hasData = total.weeks.some(week => week.entered) || state.transactions.some(t => t.date.slice(0, 7) === month && t.classification === 'included');
    return { ...total, future, hasData };
  });
  const started = months.filter(month => !month.future);
  const income = started.reduce((sum, month) => sum + month.income, 0);
  const expenses = started.reduce((sum, month) => sum + month.expenses, 0);
  const refunds = started.reduce((sum, month) => sum + month.refunds, 0);
  return { year, months, income, expenses, refunds, balance: income + refunds - expenses,
    hasData: started.some(month => month.hasData),
    missingWeeks: started.reduce((sum, month) => sum + month.missingWeeks.length, 0),
    ongoing: String(year).padStart(4, '0') === currentMonth.slice(0, 4) };
}
export type ComparisonMode = 'equivalent' | 'full';
export function change(current: number, previous: number) {
  const cents = current - previous;
  return { cents, ratio: previous === 0 ? current === 0 ? 0 : null : cents / previous };
}
export function compareMonths(state: LedgerState, currentMonth: string, previousMonth: string,
  mode: ComparisonMode = 'equivalent', now = new Date()) {
  monthStart(currentMonth); monthStart(previousMonth);
  if (!['equivalent', 'full'].includes(mode)) throw new Error('Tipo di confronto non valido.');
  const today = romeDate(now);
  if (currentMonth > today.slice(0, 7) || previousMonth > today.slice(0, 7)) throw new Error('Seleziona mesi già iniziati.');
  const ongoing = [currentMonth, previousMonth].includes(today.slice(0, 7));
  const throughDay = mode === 'equivalent' && ongoing
    ? Math.min(Number(today.slice(8)), Number(monthEnd(currentMonth).slice(8)), Number(monthEnd(previousMonth).slice(8))) : undefined;
  const current = monthlySummary(state, currentMonth, now, throughDay);
  const previous = monthlySummary(state, previousMonth, now, throughDay);
  const categoryIds = new Set([...current.categoryExpenses, ...previous.categoryExpenses].map(c => c.categoryId));
  const categories = [...categoryIds].map(categoryId => {
    const currentCents = current.categoryExpenses.find(c => c.categoryId === categoryId)?.cents ?? 0;
    const previousCents = previous.categoryExpenses.find(c => c.categoryId === categoryId)?.cents ?? 0;
    return { categoryId, current: currentCents, previous: previousCents, ...change(currentCents, previousCents) };
  }).sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents) || a.categoryId.localeCompare(b.categoryId));
  return { current, previous, ongoing, aligned: throughDay !== undefined, categories,
    refunds: change(current.refunds, previous.refunds), income: change(current.income, previous.income), expenses: change(current.expenses, previous.expenses),
    balanceChange: current.balance - previous.balance };
}
