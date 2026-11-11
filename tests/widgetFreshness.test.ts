import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLedger } from '../src/domain/model';
import { widgetSnapshot, widgetView } from '../src/domain/ledger';

test('BUG-03: snapshot della stessa settimana scade al cambio del giorno a Roma', () => {
  const state = emptyLedger(); state.cashIncome['2026-10-19'] = 10000;
  state.transactions.push({ id: 'future', origin: 'card', cents: -15000, date: '2026-10-22', description: 'Benzina', categoryId: 'transport', classification: 'included', manualCategory: true });
  const cached = widgetSnapshot(state, new Date('2026-10-21T21:59:59Z'));
  assert.equal(widgetView(cached, new Date('2026-10-21T21:59:59Z')).state, 'positive');
  assert.equal(widgetView(cached, new Date('2026-10-21T22:00:00Z')).state, 'stale');
  assert.equal(widgetSnapshot(state, new Date('2026-10-21T22:00:00Z')).balanceState, 'negative');
});

test('BUG-03: cambio ora e cambio settimana usano il giorno civile italiano', () => {
  const state = emptyLedger(); state.cashIncome['2026-10-19'] = 0;
  const cached = widgetSnapshot(state, new Date('2026-10-24T22:30:00Z'));
  assert.equal(widgetView(cached, new Date('2026-10-25T02:30:00Z')).state, 'even');
  assert.equal(widgetView(cached, new Date('2026-10-25T23:00:00Z')).state, 'stale');
});

test('BUG-03: il provider ripubblica il saldo a mezzanotte senza mutare il registro', async () => {
  const { runtimeFixture } = await import('./helpers/runtimeFixture');
  const f = await runtimeFixture();
  assert.equal(f.published.at(-1)!.balanceState, 'positive');
  const before = f.published.length;
  f.tick(); f.render(); assert.equal(f.published.length, before);
  f.setNow('2026-10-21T22:00:01Z'); f.tick(); f.render();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.published.length, before + 1);
  assert.equal(f.published.at(-1)!.balanceState, 'negative');
  f.render().lock(); f.render();
  f.setNow('2026-10-22T22:00:01Z'); f.tick(); f.render();
  assert.equal(f.published.length, before + 1);
});
