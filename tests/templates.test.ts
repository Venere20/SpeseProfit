import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerService } from '../src/application/ledgerService';
import { cloneLedger, emptyLedger, LedgerState } from '../src/domain/model';
import { loadLedger } from '../src/domain/migration';
import { templateDraft, TemplateInput } from '../src/domain/templates';
import { summary } from '../src/domain/ledger';
import { StateStorage } from '../src/ports';
const now = () => new Date('2026-10-12T12:00:00Z');
const coffee: TemplateInput = { description: 'Caffè', cents: 120, categoryId: 'dining', origin: 'cash' };
function memory(): StateStorage {
  let stored: LedgerState | null = null;
  return { async load() { return stored && cloneLedger(stored); }, async save(next) { stored = cloneLedger(next); } };
}
test('modelli persistono dopo riapertura e creazione o modifica non registra spese', async () => {
  const storage = memory(); const service = new LedgerService(storage, now); await service.init();
  await service.setWeeklyCashIncome('2026-10-12', 80000);
  await service.saveExpenseTemplate(coffee);
  const id = service.read().expenseTemplates![0]!.id;
  assert.equal(service.read().transactions.length, 0); assert.equal(summary(service.read(), '2026-10-12').balance, 80000);
  const restarted = new LedgerService(storage, now); await restarted.init();
  assert.deepEqual(restarted.read(), service.read());
  await restarted.saveExpenseTemplate({ ...coffee, cents: 150, origin: 'card' }, id);
  const again = new LedgerService(storage, now); await again.init();
  assert.deepEqual(again.read().expenseTemplates, [{ ...coffee, id, cents: 150, origin: 'card' }]);
  assert.equal(again.read().transactions.length, 0);
});
test('modello prepara data di oggi a Roma, importo e categoria, senza registrare; campi modificabili', async () => {
  const service = new LedgerService(memory(), now); await service.init(); await service.saveExpenseTemplate(coffee);
  const before = service.read(); const id = before.expenseTemplates![0]!.id;
  const draft = templateDraft(before, id, new Date('2026-10-11T22:30:00Z'));
  assert.deepEqual(draft, { ...coffee, date: '2026-10-12' });
  assert.equal('id' in draft, false); assert.equal(service.read().transactions.length, 0);
  draft.cents = 240; draft.description = 'Due caffè'; draft.origin = 'card'; draft.date = '2026-10-13';
  await service.addExpense(draft);
  assert.equal(service.read().transactions[0]!.cents, -240); assert.equal(service.read().transactions[0]!.date, '2026-10-13');
  assert.deepEqual(service.read().expenseTemplates, before.expenseTemplates);
  await service.addExpense(templateDraft(service.read(), id, now()));
  assert.equal(service.read().transactions.length, 2);
  assert.equal(new Set(service.read().transactions.map(t => t.id)).size, 2);
});
test('eliminare un modello conserva spese, incassi, categorie e regole già registrati', async () => {
  const storage = memory(); const service = new LedgerService(storage, now); await service.init();
  await service.saveExpenseTemplate(coffee); const id = service.read().expenseTemplates![0]!.id;
  await service.addExpense(templateDraft(service.read(), id, now()));
  await service.updateClassification(service.read().transactions[0]!.id, 'dining', 'included', 'caffè');
  await service.setWeeklyCashIncome('2026-10-12', 10000);
  const before = service.read(); await service.deleteExpenseTemplate(id);
  assert.deepEqual(service.read(), { ...before, expenseTemplates: [] });
  const reopened = new LedgerService(storage, now); await reopened.init(); assert.deepEqual(reopened.read(), service.read());
  assert.throws(() => templateDraft(reopened.read(), id, now()), /non disponibile/);
  await assert.rejects(service.deleteExpenseTemplate(id), /non trovato/);
});
test('archivi precedenti senza modelli restano compatibili e modelli esistenti non vengono persi nel caricamento', () => {
  const old = emptyLedger(); assert.deepEqual(loadLedger(old), { state: old, migrated: false });
  const withTemplate = { ...old, expenseTemplates: [{ ...coffee, id: 'template:1' }] };
  assert.deepEqual(loadLedger(withTemplate), { state: withTemplate, migrated: false });
  const migrated = loadLedger({ ...withTemplate, version: 1, connected: false, lastSync: null });
  assert.equal(migrated.migrated, true); assert.deepEqual(migrated.state.expenseTemplates, withTemplate.expenseTemplates);
  assert.throws(() => loadLedger({ ...old, expenseTemplates: 'invalid' }));
  assert.throws(() => loadLedger({ ...old, expenseTemplates: [{ ...coffee, id: 'same' }, { ...coffee, id: 'same' }] }));
  assert.throws(() => loadLedger({ ...old, expenseTemplates: [{ ...coffee, id: 'bad', cents: 0 }] }));
});
test('validazione e duplicati impediscono modelli non utilizzabili senza cambiare i dati', async () => {
  const service = new LedgerService(memory(), now); await service.init(); await service.saveExpenseTemplate(coffee);
  const before = service.read(); const id = before.expenseTemplates![0]!.id;
  for (const cents of [0, -120, 1.2, NaN]) await assert.rejects(service.saveExpenseTemplate({ ...coffee, cents }));
  await assert.rejects(service.saveExpenseTemplate({ ...coffee, description: ' ' }));
  await assert.rejects(service.saveExpenseTemplate({ ...coffee, description: 'x'.repeat(201) }));
  await assert.rejects(service.saveExpenseTemplate({ ...coffee, categoryId: 'income' }));
  await assert.rejects(service.saveExpenseTemplate({ ...coffee, description: '  CAFFÈ  ' }), /già presente/);
  await assert.rejects(service.saveExpenseTemplate(coffee, 'missing'), /non trovato/);
  assert.deepEqual(service.read(), before);
  await service.saveExpenseTemplate({ ...coffee, description: 'Caffè con carta', origin: 'card' });
  const beforeDuplicate = service.read();
  await assert.rejects(service.saveExpenseTemplate({ ...coffee, description: 'Caffè con carta', origin: 'card' }, id), /già presente/);
  assert.deepEqual(service.read(), beforeDuplicate);
});
test('salvataggio fallito conserva modello e archivio precedenti, anche dopo riapertura', async () => {
  let fail = false; const backing = memory();
  const service = new LedgerService({ load: () => backing.load(), async save(next) { if (fail) throw new Error('disco'); await backing.save(next); } }, now);
  await service.init(); await service.saveExpenseTemplate(coffee); const before = service.read(); const id = before.expenseTemplates![0]!.id;
  fail = true;
  await assert.rejects(service.saveExpenseTemplate({ ...coffee, cents: 150 }, id), /disco/);
  await assert.rejects(service.deleteExpenseTemplate(id), /disco/);
  assert.deepEqual(service.read(), before);
  const reopened = new LedgerService(backing, now); await reopened.init(); assert.deepEqual(reopened.read(), before);
  service.dispose(); await assert.rejects(service.saveExpenseTemplate(coffee), /bloccato/);
});
test('modelli nuovi univoci dopo cancellazione e reset completo senza modelli automatici', async () => {
  const service = new LedgerService(memory(), now); await service.init();
  assert.equal(service.read().expenseTemplates, undefined);
  for (let i = 0; i < 3; i++) await service.saveExpenseTemplate({ ...coffee, description: `Caffè ${i}` });
  const original = service.read().expenseTemplates!; await service.deleteExpenseTemplate(original[1]!.id);
  await service.saveExpenseTemplate({ ...coffee, description: 'Caffè nuovo' });
  const next = service.read().expenseTemplates!;
  assert.equal(new Set(next.map(t => t.id)).size, 3); assert.deepEqual(next[0], original[0]); assert.deepEqual(next[1], original[2]);
  await service.reset(); assert.deepEqual(service.read(), emptyLedger());
});
test('categoria automatica del modello applica le regole al salvataggio della spesa', async () => {
  const service = new LedgerService(memory(), now); await service.init();
  await service.saveExpenseTemplate({ ...coffee, categoryId: '' }); const id = service.read().expenseTemplates![0]!.id;
  await service.addExpense(templateDraft(service.read(), id, now()));
  assert.equal(service.read().transactions[0]!.categoryId, 'dining');
  await service.updateClassification(service.read().transactions[0]!.id, 'other', 'included', 'caffè');
  await service.addExpense(templateDraft(service.read(), id, now()));
  assert.equal(service.read().transactions[1]!.categoryId, 'other');
  assert.equal(service.read().expenseTemplates![0]!.categoryId, '');
});
