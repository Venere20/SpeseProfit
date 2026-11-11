import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerService } from '../src/application/ledgerService';
import { emptyLedger, Transaction } from '../src/domain/model';
import { monthlyCalendar, monthlySummary, monthStart, shiftMonth } from '../src/domain/monthly';

const now = new Date('2026-10-17T12:00:00Z');
function expense(id: string, date: string, cents: number, categoryId = 'other', classification: Transaction['classification'] = 'included'): Transaction {
  return { id, date, cents: -cents, categoryId, origin: 'card', description: id, classification, manualCategory: true };
}
test('mese: entrate, spese e classifica escludono trasferimenti e movimenti fuori mese', () => {
  const state = emptyLedger(); state.cashIncome = { '2026-09-28': 99900, '2026-10-05': 80000, '2026-10-12': 20000 };
  state.transactions = [expense('a', '2026-10-01', 30000, 'food'), expense('b', '2026-10-31', 10000, 'transport'),
    expense('c', '2026-10-03', 5000, 'food'), expense('excluded', '2026-10-10', 90000, 'home', 'excluded'),
    expense('transfer', '2026-10-12', 80000, 'home', 'transfer'), expense('next', '2026-11-01', 99900),
    { ...expense('refund', '2026-10-15', 0, 'refund'), cents: 2500 }];
  const total = monthlySummary(state, '2026-10', now);
  assert.equal(total.cashIncome, 100000); assert.equal(total.otherIncome, 0); assert.equal(total.refunds, 2500);
  assert.equal(total.income, 100000); assert.equal(total.expenses, 45000); assert.equal(total.balance, 57500);
  assert.deepEqual(total.categoryExpenses.map(c => [c.categoryId, c.cents]), [['food', 35000], ['transport', 10000]]);
  assert.equal(total.categoryExpenses[0]!.share, 35000 / 45000);
  assert.equal(total.categoryExpenses.reduce((sum, c) => sum + c.share, 0), 1);
});
test('incassi a cavallo tra mesi contati una volta; calendario mostra tutta la settimana', () => {
  const state = emptyLedger(); state.cashIncome['2026-09-28'] = 80000;
  state.transactions = [expense('september', '2026-09-30', 10000), expense('october', '2026-10-01', 20000)];
  const september = monthlySummary(state, '2026-09', now); const october = monthlySummary(state, '2026-10', now);
  assert.equal(september.cashIncome, 80000); assert.equal(october.cashIncome, 0);
  assert.equal(september.expenses, 10000); assert.equal(october.expenses, 20000);
  assert.equal(september.balance + october.balance, 50000);
  const row = monthlyCalendar(state, '2026-10', now)[0]!;
  assert.equal(row.weekStart, '2026-09-28'); assert.equal(row.weekEnd, '2026-10-04');
  assert.equal(row.closure, 'positive'); assert.equal(row.total.balance, 50000);
});
test('calendario: positivo, negativo, pari, incompleto, in corso e futuro sono distinti', () => {
  const state = emptyLedger(); state.cashIncome = { '2026-09-28': 10000, '2026-10-05': 0, '2026-10-12': 0 };
  state.transactions = [expense('loss', '2026-10-06', 100)];
  const rows = monthlyCalendar(state, '2026-10', new Date('2026-10-25T12:00:00Z'));
  assert.deepEqual(rows.map(row => row.closure), ['positive', 'negative', 'even', 'ongoing', 'future']);
  delete state.cashIncome['2026-10-12'];
  assert.equal(monthlyCalendar(state, '2026-10', new Date('2026-10-25T12:00:00Z'))[2]!.closure, 'incomplete');
  assert.equal(monthlyCalendar(state, '2026-10', new Date('2026-10-18T21:59:59Z'))[2]!.closure, 'ongoing');
  state.cashIncome['2026-10-12'] = 0;
  assert.equal(monthlyCalendar(state, '2026-10', new Date('2026-10-18T22:00:00Z'))[2]!.closure, 'even');
});
test('zero esplicito non è incasso mancante e le settimane future non rendono parziale il mese', () => {
  const state = emptyLedger(); state.cashIncome['2026-10-05'] = 0;
  assert.deepEqual(monthlySummary(state, '2026-10', now).missingWeeks, ['2026-10-12']);
  state.cashIncome['2026-10-12'] = 0;
  const total = monthlySummary(state, '2026-10', now);
  assert.deepEqual(total.missingWeeks, []); assert.equal(total.balance, 0);
  assert.equal(total.weeks.find(w => w.weekStart === '2026-10-19')!.started, false);
});
test('calendario completo per mesi di quattro e sei righe, bisestile e cambio anno', () => {
  const state = emptyLedger();
  assert.equal(monthlyCalendar(state, '2027-02', now).length, 4);
  assert.equal(monthlyCalendar(state, '2026-08', now).length, 6);
  assert.ok(monthlyCalendar(state, '2028-02', now).flatMap(row => row.days).includes('2028-02-29'));
  assert.equal(monthlyCalendar(state, '2027-01', now)[0]!.weekStart, '2026-12-28');
  assert.equal(shiftMonth('2026-12', 1), '2027-01'); assert.equal(shiftMonth('2027-01', -1), '2026-12');
  for (const month of ['2026-13', '2026-00', '2026-1', 'invalid']) assert.throws(() => monthStart(month));
  assert.throws(() => shiftMonth('2026-10', 1.5));
});
test('modifica e cancellazione aggiornano mese, classifica e percentuali senza dati residui', async () => {
  const service = new LedgerService({ async load() { return null; }, async save() {} }); await service.init();
  await service.addExpense({ date: '2026-10-12', cents: 12345, description: 'Spesa', categoryId: 'food', origin: 'cash' });
  const id = service.read().transactions[0]!.id;
  assert.equal(monthlySummary(service.read(), '2026-10', now).categoryExpenses[0]!.share, 1);
  await service.updateExpense(id, { date: '2026-11-02', cents: 5678, description: 'Modifica', categoryId: 'home', origin: 'card', classification: 'included' });
  assert.deepEqual(monthlySummary(service.read(), '2026-10', now).categoryExpenses, []);
  assert.deepEqual(monthlySummary(service.read(), '2026-11', now).categoryExpenses, [{ categoryId: 'home', cents: 5678, share: 1 }]);
  await service.deleteExpense(id);
  const empty = monthlySummary(service.read(), '2026-11', now);
  assert.equal(empty.expenses, 0); assert.deepEqual(empty.categoryExpenses, []);
});
