import { LedgerState } from './model';
import { romeDate, shiftDate, summary, validateDate, weekOf } from './ledger';

export function validateReminder(raw: unknown): NonNullable<LedgerState['dailyReminder']> {
  if (!raw || typeof raw !== 'object') throw new Error('Promemoria non valido.');
  const r = raw as Record<string, unknown>;
  if (typeof r.enabled !== 'boolean' || !Number.isInteger(r.hour) || !Number.isInteger(r.minute) ||
      (r.hour as number) < 0 || (r.hour as number) > 23 || (r.minute as number) < 0 || (r.minute as number) > 59) throw new Error('Orario del promemoria non valido.');
  return { enabled: r.enabled, hour: r.hour as number, minute: r.minute as number };
}
export function validateMonday(date: string): string {
  if (weekOf(date) !== date) throw new Error('Scegli una settimana che inizia di lunedì.');
  return date;
}
export function validateCompletedDays(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.some(d => typeof d !== 'string') || new Set(raw).size !== raw.length) throw new Error('Giornate completate non valide.');
  return raw.map(d => validateDate(d));
}
export function weeklyReport(state: LedgerState, week: string, now = new Date()) {
  validateMonday(week);
  const today = romeDate(now); const current = weekOf(today);
  const end = week === current ? today : shiftDate(week, 6);
  const visible = { ...state, transactions: state.transactions.filter(t => t.date <= end) };
  const total = summary(visible, week);
  const previousWeek = shiftDate(week, -7);
  const previousEnd = week === current ? shiftDate(today, -7) : shiftDate(previousWeek, 6);
  const previous = summary({ ...state, transactions: state.transactions.filter(t => t.date <= previousEnd) }, previousWeek);
  const previousHasData = previous.hasCashIncome || state.transactions.some(t => t.classification === 'included' && t.date >= previousWeek && t.date <= previousEnd);
  return { total, end, ongoing: week === current, closed: week < current,
    previousWeek, previousEnd, previousHasData, expenseDelta: total.expenses - previous.expenses,
    previousComplete: previous.hasCashIncome };
}
export function accumulatedReport(state: LedgerState, from?: string, now = new Date()) {
  const today = romeDate(now); const current = weekOf(today);
  const recorded = [...Object.keys(state.cashIncome), ...state.transactions.filter(t => t.date <= today).map(t => weekOf(t.date))].filter(w => w <= current).sort();
  const start = from ?? state.accumulationStart ?? recorded[0] ?? current;
  validateMonday(start);
  if (start > current) throw new Error('La settimana iniziale non può essere futura.');
  const visible = { ...state, transactions: state.transactions.filter(t => t.date <= today) };
  const rows = []; let income = 0; let expenses = 0; let refunds = 0; let running = 0;
  const missingWeeks: string[] = [];
  for (let week = start; week <= current; week = shiftDate(week, 7)) {
    const total = summary(visible, week);
    if (!total.hasCashIncome) missingWeeks.push(week);
    income += total.income; expenses += total.expenses; refunds += total.refunds; running += total.balance;
    rows.push({ ...total, accumulated: running, ongoing: week === current });
  }
  return { start, through: today, rows, income, expenses, refunds, balance: income + refunds - expenses, missingWeeks,
    hasData: recorded.some(w => w >= start), ongoing: true };
}
