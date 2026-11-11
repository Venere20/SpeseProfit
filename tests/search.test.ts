import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLedger, Transaction } from '../src/domain/model';
import { MovementFilters, searchMovements } from '../src/domain/search';
const filters: MovementFilters = { query: '', category: 'all', origin: 'all', period: 'all', week: '2026-10-12', from: '2026-10-12', to: '2026-10-18' };
const state = emptyLedger();
const tx = (id: string, date: string, description: string, categoryId = 'dining', origin: Transaction['origin'] = 'card', classification: Transaction['classification'] = 'included'): Transaction => ({ id, date, description, categoryId, origin, classification, cents: -120, manualCategory: true });
state.transactions = [tx('a','2026-10-12','Caffè mattina'), tx('b','2026-10-18','Cena amici','dining','cash'), tx('c','2026-09-02','Abbonamento autobus','transport'), tx('d','2026-10-19','Caffè pomeriggio','dining','card','excluded')];

test('ricerca combina parole su descrizione e categoria, senza accenti o maiuscole', () => {
  assert.deepEqual(searchMovements(state, { ...filters, query: ' CAFFE  RISTORANTI ' }).map(t => t.id), ['d','a']);
  assert.deepEqual(searchMovements(state, { ...filters, query: 'TRASPORTI' }).map(t => t.id), ['c']);
  assert.deepEqual(searchMovements(state, { ...filters, query: 'caffè amici' }), []);
});
test('filtri combinati e intervallo inclusivo ai due estremi', () => {
  assert.deepEqual(searchMovements(state, { ...filters, period: 'range' }).map(t => t.id), ['b','a']);
  assert.deepEqual(searchMovements(state, { ...filters, period: 'week', origin: 'cash', category: 'dining' }).map(t => t.id), ['b']);
  assert.deepEqual(searchMovements(state, { ...filters, period: 'range', from: '2026-10-18', to: '2026-10-18' }).map(t => t.id), ['b']);
});
test('date invalide o invertite non espongono accidentalmente tutto lo storico', () => {
  assert.throws(() => searchMovements(state, { ...filters, period: 'range', from: '2026-10-19' }));
  assert.throws(() => searchMovements(state, { ...filters, period: 'range', to: '2026-02-30' }));
});
test('storico include gli esclusi, resta ordinato e non modifica dati o incassi', () => {
  const before = JSON.stringify(state);
  assert.deepEqual(searchMovements(state, filters).map(t => t.id), ['d','b','a','c']);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(searchMovements(emptyLedger(), filters), []);
});
