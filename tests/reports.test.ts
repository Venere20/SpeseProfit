import test from 'node:test';
import assert from 'node:assert/strict';
import { annualSummary, change, compareMonths } from '../src/domain/reports';
import { monthlySummary } from '../src/domain/monthly';
import { emptyLedger, Transaction } from '../src/domain/model';
import { LedgerService } from '../src/application/ledgerService';
const now = new Date('2026-10-17T12:00:00Z');
function expense(id: string, date: string, cents: number, categoryId = 'other', classification: Transaction['classification'] = 'included'): Transaction {
  return { id, date, cents: -cents, categoryId, origin: 'card', description: id, classification, manualCategory: true };
}
test('anno: dodici mesi, totali coerenti, futuro e trasferimenti esclusi', () => {
  const state = emptyLedger(); state.cashIncome = { '2026-01-05': 100000, '2026-09-07': 80000, '2026-10-05': 50000, '2026-11-02': 999999 };
  state.transactions = [expense('january', '2026-01-10', 20000), expense('september', '2026-09-10', 40000), expense('october', '2026-10-12', 10000),
    expense('future', '2026-11-03', 999999), expense('excluded', '2026-01-12', 10000, 'other', 'excluded'), expense('transfer', '2026-09-12', 80000, 'other', 'transfer')];
  const report = annualSummary(state, 2026, now);
  assert.equal(report.months.length, 12); assert.equal(report.income, 230000); assert.equal(report.expenses, 70000); assert.equal(report.balance, 160000);
  assert.equal(report.months[10]!.future, true); assert.equal(report.ongoing, true); assert.equal(report.hasData, true);
  const sum = report.months.filter(m => !m.future).reduce((value, m) => value + m.balance, 0);
  assert.equal(sum, report.balance); assert.ok(report.missingWeeks > 0);
});
test('anno precedente completo e confine dicembre-gennaio senza duplicazione di incassi', () => {
  const state = emptyLedger(); state.cashIncome = { '2025-12-29': 100000, '2026-01-05': 80000 };
  state.transactions = [expense('december', '2025-12-31', 30000), expense('january', '2026-01-01', 20000)];
  const previous = annualSummary(state, 2025, now); const current = annualSummary(state, 2026, now);
  assert.equal(previous.balance, 70000); assert.equal(current.balance, 60000);
  assert.equal(previous.balance + current.balance, 130000); assert.equal(previous.ongoing, false);
  const empty = annualSummary(emptyLedger(), 2025, now);
  assert.equal(empty.hasData, false); assert.equal(empty.balance, 0);
  assert.throws(() => annualSummary(state, NaN, now)); assert.throws(() => annualSummary(state, 2026.5, now));
});
test('mese in corso: stessi giorni, incassi e spese successivi al taglio esclusi', () => {
  const state = emptyLedger(); state.cashIncome = { '2026-10-05': 10000, '2026-10-12': 20000, '2026-10-19': 99999,
    '2026-09-07': 15000, '2026-09-14': 25000, '2026-09-21': 88888 };
  state.transactions = [expense('october', '2026-10-17', 3000), expense('october-late', '2026-10-18', 99999),
    expense('september', '2026-09-17', 4000), expense('september-late', '2026-09-18', 88888)];
  const result = compareMonths(state, '2026-10', '2026-09', 'equivalent', now);
  assert.equal(result.aligned, true); assert.equal(result.current.throughDate, '2026-10-17'); assert.equal(result.previous.throughDate, '2026-09-17');
  assert.equal(result.current.income, 30000); assert.equal(result.previous.income, 40000);
  assert.equal(result.current.expenses, 3000); assert.equal(result.previous.expenses, 4000);
  assert.equal(result.income.cents, -10000); assert.equal(result.income.ratio, -0.25);
  assert.equal(result.expenses.cents, -1000); assert.equal(result.expenses.ratio, -0.25);
  assert.deepEqual(result.current.missingWeeks, []);
});
test('mesi conclusi interi, mesi corti e bisestili con periodi dichiarati correttamente', () => {
  const state = emptyLedger();
  const closed = compareMonths(state, '2026-09', '2026-08', 'equivalent', now);
  assert.equal(closed.aligned, false); assert.equal(closed.current.throughDate, '2026-09-30'); assert.equal(closed.previous.throughDate, '2026-08-31');
  const shorter = compareMonths(state, '2027-03', '2027-02', 'equivalent', new Date('2027-03-31T12:00:00Z'));
  assert.equal(shorter.current.throughDate, '2027-03-28'); assert.equal(shorter.previous.throughDate, '2027-02-28');
  const leap = compareMonths(state, '2028-03', '2028-02', 'equivalent', new Date('2028-03-31T12:00:00Z'));
  assert.equal(leap.current.throughDate, '2028-03-29'); assert.equal(leap.previous.throughDate, '2028-02-29');
  const full = compareMonths(state, '2026-10', '2026-09', 'full', now);
  assert.equal(full.current.throughDate, '2026-10-31'); assert.equal(full.ongoing, true); assert.equal(full.aligned, false);
});
test('confronto categorie: nuove, eliminate e variazioni percentuali senza divisioni per zero', () => {
  const state = emptyLedger(); state.transactions = [expense('food-new', '2026-09-10', 5000, 'food'), expense('food-old', '2026-08-10', 10000, 'food'),
    expense('home-new', '2026-09-10', 2000, 'home'), expense('transport-old', '2026-08-10', 1000, 'transport')];
  const result = compareMonths(state, '2026-09', '2026-08', 'full', now);
  assert.deepEqual(result.categories.map(c => [c.categoryId, c.cents, c.ratio]), [['food', -5000, -0.5], ['home', 2000, null], ['transport', -1000, -1]]);
  assert.deepEqual(change(0, 0), { cents: 0, ratio: 0 }); assert.deepEqual(change(100, 0), { cents: 100, ratio: null });
  assert.equal(result.balanceChange, 4000);
});
test('confronto dello stesso mese invariato e rifiuto di mesi futuri o parametri non validi', () => {
  const state = emptyLedger(); state.cashIncome['2026-10-05'] = 0;
  const result = compareMonths(state, '2026-10', '2026-10', 'equivalent', now);
  assert.equal(result.income.cents, 0); assert.equal(result.expenses.cents, 0); assert.equal(result.balanceChange, 0);
  assert.deepEqual(result.current.missingWeeks, ['2026-10-12']);
  assert.throws(() => compareMonths(state, '2026-11', '2026-09', 'full', now));
  assert.throws(() => compareMonths(state, '2026-13', '2026-09', 'full', now));
  assert.throws(() => monthlySummary(state, '2026-10', now, 0));
});
test('ricalcolo di anno e confronto dopo modifica e cancellazione senza cambiare lo storico', async () => {
  const service = new LedgerService({ async load() { return null; }, async save() {} }); await service.init();
  await service.addExpense({ date: '2026-10-12', cents: 1234, description: 'Spesa', categoryId: 'food', origin: 'cash' });
  const id = service.read().transactions[0]!.id;
  assert.equal(annualSummary(service.read(), 2026, now).expenses, 1234);
  assert.equal(compareMonths(service.read(), '2026-10', '2026-09', 'full', now).expenses.cents, 1234);
  await service.updateExpense(id, { date: '2025-12-31', cents: 5678, description: 'Modificata', categoryId: 'home', origin: 'card', classification: 'included' });
  assert.equal(annualSummary(service.read(), 2026, now).expenses, 0);
  assert.equal(annualSummary(service.read(), 2025, now).expenses, 5678);
  await service.deleteExpense(id); assert.equal(annualSummary(service.read(), 2025, now).expenses, 0);
});
