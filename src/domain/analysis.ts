import { money, romeDate, shiftDate, summary, weekOf } from './ledger';
import { LedgerState } from './model';
export function dayReport(state: LedgerState, day: string) {
  // weekOf validates the date, while the report never invents a daily income.
  weekOf(day);
  const expenses = state.transactions.filter(t => t.date === day && t.cents < 0 && t.classification === 'included');
  return { day, cents: expenses.reduce((n,t) => n - t.cents, 0), count: expenses.length,
    top: [...expenses].sort((a,b) => a.cents - b.cents || a.id.localeCompare(b.id)).slice(0,3) };
}
export function weeklyBars(state: LedgerState, selected: string, now = new Date()) {
  const week = weekOf(selected); const today = romeDate(now);
  return Array.from({ length: 5 }, (_, index) => {
    const start = shiftDate(week, (index - 4) * 7);
    const visible = { ...state, transactions: state.transactions.filter(t => t.date <= today) };
    return summary(visible, start);
  });
}
export function shortDate(day: string) { return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z')); }
export function weekLabel(day: string, year = true) {
  const start = weekOf(day); const end = shiftDate(start,6);
  const f = (d: string, withYear: boolean) => new Intl.DateTimeFormat('it-IT', { day:'numeric', month:'long', ...(withYear ? { year:'numeric' as const } : {}), timeZone:'UTC' }).format(new Date(d+'T12:00:00Z'));
  return start.slice(0,7) === end.slice(0,7) ? `${Number(start.slice(8))}–${f(end,year)}` : `${f(start, start.slice(0,4)!==end.slice(0,4))} – ${f(end,year)}`;
}
export function chartValue(cents: number) { return money(cents).replace(',00',''); }
