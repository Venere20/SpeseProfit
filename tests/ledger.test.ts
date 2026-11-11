import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLedger } from '../src/domain/model';
import { categoryFor, parseMoney, passwordProblem, romeDate, shiftDate, summary, validateDate, weekOf, widgetSnapshot, widgetView } from '../src/domain/ledger';
const monday = '2026-10-12';
test('800 incassati, 250 con carta e 50 contanti = +500', () => {
  const state = emptyLedger(); state.cashIncome[monday] = 80000;
  state.transactions = [
    { id: 'b', origin: 'card', cents: -25000, date: monday, description: 'Spesa', categoryId: 'other', classification: 'included', manualCategory: false },
    { id: 'c', origin: 'cash', cents: -5000, date: monday, description: 'Spesa', categoryId: 'other', classification: 'included', manualCategory: true },
  ];
  assert.equal(summary(state, monday).balance, 50000);
  assert.equal(summary(state, monday).balanceState, 'positive');
});
test('incasso mancante distinto da zero esplicito', () => {
  const state = emptyLedger(); assert.equal(summary(state, monday).balanceState, 'incomplete');
  state.cashIncome[monday] = 0; assert.equal(summary(state, monday).balanceState, 'even');
});
test('accrediti, rimborsi, trasferimenti e esclusioni', () => {
  const state = emptyLedger(); state.cashIncome[monday] = 0;
  state.transactions = [
    { id: '1', origin: 'card', cents: 80000, date: monday, description: 'Versamento', categoryId: 'income', classification: 'transfer', manualCategory: false },
    { id: '2', origin: 'card', cents: -5000, date: monday, description: 'Prelievo', categoryId: 'other', classification: 'transfer', manualCategory: false },
    { id: '3', origin: 'card', cents: -1000, date: monday, description: 'Spesa esclusa', categoryId: 'other', classification: 'excluded', manualCategory: false },
    { id: '4', origin: 'card', cents: 2500, date: monday, description: 'Rimborso', categoryId: 'refund', classification: 'included', manualCategory: false },
  ];
  assert.equal(summary(state, monday).balance, 2500);
});
test('categorizzazione locale, regole più recenti e tipo entrata', () => {
  const s = emptyLedger(); assert.equal(categoryFor(s, 'SUPERMERCATO CONAD', -100), 'food');
  s.rules = [{ id: '1', match: 'conad', categoryId: 'shopping' }, { id: '2', match: 'conad', categoryId: 'other' }];
  assert.equal(categoryFor(s, 'Conad', -100), 'other'); assert.equal(categoryFor(s, 'Conad rimborso', 100), 'refund');
});
test('settimane attraverso domenica, cambio ora e cambio anno', () => {
  assert.equal(weekOf('2026-10-18'), monday); assert.equal(weekOf('2026-10-19'), '2026-10-19');
  assert.equal(weekOf('2026-10-25'), '2026-10-19'); assert.equal(weekOf('2027-01-01'), '2026-12-28');
  assert.equal(shiftDate('2026-03-29', 1), '2026-03-30');
  assert.equal(romeDate(new Date('2026-10-11T22:30:00Z')), monday);
  assert.equal(romeDate(new Date('2026-10-25T23:30:00Z')), '2026-10-26');
});
test('importi in centesimi, date e limiti', () => {
  assert.equal(parseMoney('800,50'), 80050); assert.equal(parseMoney('0'), 0); assert.equal(parseMoney('0.01'), 1);
  for (const input of ['1,001', '-50', '1.000,00', 'NaN', '', '1e4']) assert.throws(() => parseMoney(input));
  assert.throws(() => validateDate('2026-02-30')); assert.throws(() => validateDate('2026-2-01'));
});
test('movimento tardivo ricalcola solo la settimana contabile', () => {
  const s = emptyLedger(); s.transactions.push({ id: 'late', origin: 'card', date: '2026-10-11', cents: -1800, description: 'Cinema', categoryId: 'leisure', classification: 'included', manualCategory: true });
  assert.equal(summary(s, '2026-10-05').expenses, 1800); assert.equal(summary(s, monday).expenses, 0);
});
test('widget non espone importi e invalida dati vecchi o nuova settimana', () => {
  const now = new Date('2026-10-12T12:00:00Z'); const s = emptyLedger(); s.cashIncome[monday] = 1;
  const snapshot = widgetSnapshot(s, now);
  assert.deepEqual(Object.keys(snapshot).sort(), ['balanceState', 'calculatedAt', 'weekStart']);
  assert.equal(widgetView(snapshot, now).label, 'Positivo');
  assert.equal(widgetView(snapshot, new Date('2026-10-18T12:00:01Z')).state, 'stale');
  assert.equal(widgetView(snapshot, new Date('2026-10-19T12:00:00Z')).state, 'stale');
  delete s.cashIncome[monday]; assert.equal(widgetView(widgetSnapshot(s, now), now).state, 'incomplete');
  assert.equal(widgetView({ ...snapshot, calculatedAt: 'invalid' }, now).state, 'stale');
  assert.equal(widgetView({ ...snapshot, calculatedAt: '2026-10-13T12:00:00Z' }, now).state, 'stale');
  assert.equal(widgetView({ ...snapshot, calculatedAt: '2026-10-11T12:00:00Z' }, now).state, 'stale');
});
test('password: lunghezza, Unicode e valori prevedibili', () => {
  assert.ok(passwordProblem('breve')); assert.ok(passwordProblem('passwordpassword')); assert.ok(passwordProblem('x'.repeat(16)));
  assert.equal(passwordProblem('una frase personale abbastanza lunga'), null); assert.ok(passwordProblem('x'.repeat(129)));
});
