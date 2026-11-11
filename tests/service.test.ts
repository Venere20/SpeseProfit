import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerService } from '../src/application/ledgerService';
import { LedgerState, cloneLedger, emptyLedger } from '../src/domain/model';
import { loadLedger } from '../src/domain/migration';
import { summary, widgetSnapshot } from '../src/domain/ledger';
import { StateStorage } from '../src/ports';
const now = () => new Date('2026-10-12T12:00:00Z');
const week = '2026-10-12';
const expense = { date: week, cents: 5000, description: 'Mercato', categoryId: 'other', origin: 'cash' as const };
function memory(): StateStorage {
  let state: LedgerState | null = null;
  return { async load() { return state && cloneLedger(state); }, async save(s) { state = cloneLedger(s); } };
}
test('blocco durante caricamento non ripristina lo stato', async () => {
  let finish!: (state: LedgerState | null) => void;
  const service = new LedgerService({ load: () => new Promise(resolve => { finish = resolve; }), async save() {} }, now);
  const pending = service.init(); service.dispose(); finish(null);
  await assert.rejects(pending, /bloccato/); assert.throws(() => service.read(), /bloccato/);
});
test('blocco durante salvataggio impedisce pubblicazione e operazioni accodate', async () => {
  let finish!: () => void; let started!: () => void; let saves = 0;
  const saving = new Promise<void>(resolve => { started = resolve; });
  const service = new LedgerService({ async load() { return null; }, save() {
    saves++; started(); return new Promise<void>(resolve => { finish = resolve; });
  } }, now);
  await service.init();
  const pending = service.addExpense(expense); const queued = service.setWeeklyCashIncome(week, 90000);
  await saving; service.dispose(); finish();
  await assert.rejects(pending, /bloccato/); await assert.rejects(queued, /bloccato/);
  assert.equal(saves, 1); assert.throws(() => service.read(), /bloccato/);
});
test('incasso sostituito, spesa validata e persistenza dopo riavvio', async () => {
  const storage = memory(); const service = new LedgerService(storage, now); await service.init();
  await service.setWeeklyCashIncome(week, 80000); await service.setWeeklyCashIncome(week, 90000);
  await service.addExpense(expense);
  const restarted = new LedgerService(storage, now); await restarted.init();
  assert.equal(restarted.read().cashIncome[week], 90000); assert.equal(restarted.read().transactions.length, 1);
  assert.throws(() => service.addExpense({ ...expense, cents: 0 }));
  await assert.rejects(service.addExpense({ ...expense, categoryId: 'income' }));
});
test('salvataggio fallito non pubblica modifiche e coda resta utilizzabile', async () => {
  let fail = true; const storage: StateStorage = { async load() { return null; }, async save() { if (fail) throw new Error('disco'); } };
  const service = new LedgerService(storage, now); await service.init();
  await assert.rejects(service.addExpense(expense)); assert.equal(service.read().transactions.length, 0);
  fail = false; await service.addExpense(expense); assert.equal(service.read().transactions.length, 1);
});
test('mutazioni concorrenti sono serializzate senza perdere spese', async () => {
  const service = new LedgerService(memory(), now); await service.init();
  await Promise.all(Array.from({ length: 5 }, (_, i) => service.addExpense({ ...expense, description: `Spesa ${i}` })));
  assert.equal(new Set(service.read().transactions.map(t => t.id)).size, 5);
});
test('carta e contanti, categoria automatica e regole applicate ai nuovi inserimenti', async () => {
  const service = new LedgerService(memory(), now); await service.init();
  await service.setWeeklyCashIncome(week, 80000);
  await service.addExpense({ ...expense, origin: 'card', cents: 25000, description: 'Conad', categoryId: '' });
  const id = service.read().transactions[0]!.id;
  assert.equal(service.read().transactions[0]!.categoryId, 'food');
  await service.updateClassification(id, 'shopping', 'included', 'conad');
  await service.addExpense({ ...expense, description: 'Conad', categoryId: '' });
  assert.equal(service.read().transactions[1]!.categoryId, 'shopping');
  assert.equal(summary(service.read(), week).balance, 50000);
  await service.addExpense({ ...expense, description: 'Conad', categoryId: 'other' });
  assert.equal(service.read().transactions[2]!.categoryId, 'other');
});
test('classificazione, regola e reset', async () => {
  const service = new LedgerService(memory(), now); await service.init(); await service.addExpense(expense);
  const id = service.read().transactions[0]!.id;
  await service.updateClassification(id, 'shopping', 'transfer', 'mercato');
  assert.equal(summary(service.read(), week).expenses, 0);
  await assert.rejects(service.addCategory('Alimentari', 'expense'));
  await service.addCategory('Animali', 'expense'); await service.reset();
  assert.deepEqual(service.read(), emptyLedger());
});
function legacy() {
  return { ...emptyLedger(), version: 1, connected: true, lastSync: now().toISOString(),
    transactions: [
      { ...expense, id: 'cash:1', cents: -5000, classification: 'included', manualCategory: true },
      { ...expense, id: 'bank:fake', bankId: 'fake', origin: 'bank', cents: -25000, classification: 'included', manualCategory: false },
    ], cashIncome: { [week]: 80000 },
    categories: [...emptyLedger().categories, { id: 'custom:1', kind: 'expense', name: 'Animali' }],
    rules: [{ id: 'rule:1', match: 'veterinario', categoryId: 'custom:1' }] };
}
test('migrazione esclude la simulazione ma conserva integralmente dati manuali e record precedenti', async () => {
  const original = legacy(); const before = JSON.stringify(original); let saved: LedgerState | undefined;
  const service = new LedgerService({ async load() { return original; }, async save(next) { saved = cloneLedger(next); } }, now);
  await service.init(); const next = service.read();
  assert.equal(next.version, 3); assert.equal(next.transactions.length, 1);
  assert.deepEqual(next.transactions[0], original.transactions[0]);
  assert.deepEqual(next.cashIncome, original.cashIncome); assert.deepEqual(next.categories, original.categories);
  assert.deepEqual(next.rules, original.rules); assert.deepEqual(next.retiredSimulation, [original.transactions[1]]);
  assert.equal(summary(next, week).balance, 75000); assert.deepEqual(saved, next);
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(loadLedger(next), { state: next, migrated: false });
  assert.equal('connected' in next, false); assert.equal('lastSync' in next, false);
});
test('migrazione fallita non espone importi vecchi né dati parzialmente migrati', async () => {
  const service = new LedgerService({ async load() { return legacy(); }, async save() { throw new Error('disco'); } }, now);
  await assert.rejects(service.init(), /disco/);
  assert.deepEqual(service.read(), emptyLedger());
});
test('formati futuri o movimenti sconosciuti non vengono cancellati silenziosamente', () => {
  assert.throws(() => loadLedger({ ...legacy(), version: 3 }));
  assert.throws(() => loadLedger({ ...emptyLedger(), transactions: legacy().transactions }));
  assert.throws(() => loadLedger({ ...legacy(), transactions: [{ origin: 'unknown' }] }));
  assert.throws(() => loadLedger(null));
});


test('modifica completa mantiene identità e ricalcola entrambe le settimane dopo riapertura', async () => {
  const storage = memory(); const service = new LedgerService(storage, now); await service.init();
  await service.setWeeklyCashIncome(week, 80000); await service.setWeeklyCashIncome('2026-10-19', 10000);
  await service.addExpense(expense); await service.addExpense({ ...expense, description: 'Intatta', cents: 1000 });
  const [first, untouched] = service.read().transactions;
  const changed = { date: '2026-10-20', cents: 7500, description: '  Farmacia  ', categoryId: '', origin: 'card' as const, classification: 'included' as const };
  await service.updateExpense(first!.id, changed);
  const next = service.read();
  assert.deepEqual(next.transactions[0], { id: first!.id, date: changed.date, cents: -7500, description: 'Farmacia', categoryId: 'health', origin: 'card', classification: 'included', manualCategory: false });
  assert.deepEqual(next.transactions[1], untouched);
  assert.equal(summary(next, week).expenses, 1000); assert.equal(summary(next, '2026-10-19').balance, 2500);
  const reopened = new LedgerService(storage, now); await reopened.init(); assert.deepEqual(reopened.read(), next);
});
test('modifica di categoria, esclusione e nuova regola è una sola operazione persistente', async () => {
  const service = new LedgerService(memory(), now); await service.init(); await service.addExpense(expense);
  const id = service.read().transactions[0]!.id;
  await service.updateExpense(id, { ...expense, description: 'Conad', categoryId: 'shopping', classification: 'excluded' }, 'conad');
  assert.equal(summary(service.read(), week).expenses, 0);
  await service.addExpense({ ...expense, description: 'Conad', categoryId: '' });
  assert.equal(service.read().transactions[1]!.categoryId, 'shopping');
  assert.equal(service.read().transactions[0]!.manualCategory, true);
});
test('modifiche non valide non alterano alcun campo né aggiungono regole', async () => {
  const service = new LedgerService(memory(), now); await service.init(); await service.addExpense(expense);
  const before = service.read(); const id = before.transactions[0]!.id;
  const valid = { ...expense, classification: 'included' as const };
  for (const cents of [0, -1, 1.5, NaN]) assert.throws(() => service.updateExpense(id, { ...valid, cents }));
  assert.throws(() => service.updateExpense(id, { ...valid, date: '2026-02-30' }));
  assert.throws(() => service.updateExpense(id, { ...valid, description: ' ' }));
  assert.throws(() => service.updateExpense(id, { ...valid, description: 'x'.repeat(201) }));
  await assert.rejects(service.updateExpense(id, { ...valid, categoryId: 'income' }));
  await assert.rejects(service.updateExpense(id, valid, 'xx'));
  await assert.rejects(service.updateExpense('missing', valid));
  assert.deepEqual(service.read(), before);
});
test('cancellazione rimuove solo la spesa scelta, ricalcola saldo e widget e persiste', async () => {
  const storage = memory(); const service = new LedgerService(storage, now); await service.init();
  await service.setWeeklyCashIncome(week, 4000); await service.addExpense(expense); await service.addExpense({ ...expense, cents: 1000 });
  const [first, second] = service.read().transactions;
  await service.updateClassification(first!.id, 'other', 'included', 'mercato');
  assert.equal(summary(service.read(), week).balanceState, 'negative');
  await service.deleteExpense(first!.id);
  assert.deepEqual(service.read().transactions, [second]); assert.equal(summary(service.read(), week).balance, 3000);
  assert.equal(widgetSnapshot(service.read(), now()).balanceState, 'positive');
  assert.equal(service.read().rules.length, 1); assert.equal(service.read().cashIncome[week], 4000);
  const reopened = new LedgerService(storage, now); await reopened.init(); assert.deepEqual(reopened.read(), service.read());
  await assert.rejects(service.deleteExpense(first!.id), /non trovata/);
});
test('errore di scrittura non pubblica modifica, regola o cancellazione', async () => {
  const backing = memory(); let fail = false;
  const service = new LedgerService({ load: () => backing.load(), async save(next) { if (fail) throw new Error('disco'); await backing.save(next); } }, now);
  await service.init(); await service.addExpense(expense); const before = service.read(); const id = before.transactions[0]!.id;
  fail = true;
  await assert.rejects(service.updateExpense(id, { ...expense, cents: 7500, classification: 'excluded' }, 'mercato'), /disco/);
  await assert.rejects(service.deleteExpense(id), /disco/); assert.deepEqual(service.read(), before);
  const reopened = new LedgerService(backing, now); await reopened.init(); assert.deepEqual(reopened.read(), before);
  fail = false; await service.deleteExpense(id); assert.equal(service.read().transactions.length, 0);
});
test('nuove spese restano univoche dopo cancellazione di una spesa intermedia nello stesso millisecondo', async () => {
  const service = new LedgerService(memory(), now); await service.init();
  await Promise.all(Array.from({ length: 3 }, () => service.addExpense(expense)));
  const original = service.read().transactions; await service.deleteExpense(original[1]!.id); await service.addExpense(expense);
  const next = service.read().transactions;
  assert.equal(next.length, 3); assert.equal(new Set(next.map(t => t.id)).size, 3);
  assert.deepEqual(next[0], original[0]); assert.deepEqual(next[1], original[2]);
});
