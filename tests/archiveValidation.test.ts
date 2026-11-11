import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLedger } from '../src/domain/model';
import { loadLedger } from '../src/domain/migration';
import { LedgerService } from '../src/application/ledgerService';

const row = { id:'x', origin:'card', date:'2026-10-19', cents:-120, description:'Caffè', categoryId:'dining', classification:'included', manualCategory:true };
test('BUG-04: incassi non numerici e settimane non lunedì vengono rifiutati', () => {
  for (const cents of ['10000', NaN, Infinity, -1, 0.5, 100_000_000_001]) {
    assert.throws(() => loadLedger({...emptyLedger(),cashIncome:{'2026-10-19':cents}}));
  }
  assert.throws(() => loadLedger({...emptyLedger(),cashIncome:{'2026-10-20':100}}));
  assert.equal(loadLedger({...emptyLedger(),cashIncome:{'2026-10-19':0}}).state.cashIncome['2026-10-19'],0);
});
test('BUG-04: movimenti incompleti, duplicati, tipi e riferimenti errati non aprono il registro', () => {
  const invalid = [
    {origin:'card'}, {...row,cents:'120'}, {...row,cents:NaN}, {...row,cents:-0.1},
    {...row,date:'2026-02-30'}, {...row,description:''}, {...row,manualCategory:'true'},
    {...row,categoryId:'missing'}, {...row,categoryId:'income'}, {...row,classification:'unknown'},
  ];
  for (const value of invalid) assert.throws(() => loadLedger({...emptyLedger(),transactions:[value]}), JSON.stringify(value));
  assert.throws(() => loadLedger({...emptyLedger(),transactions:[row,row]}));
});
test('BUG-04: categorie e regole duplicate o prive di riferimenti validi vengono rifiutate', () => {
  const state = emptyLedger();
  assert.throws(() => loadLedger({...state,categories:[...state.categories,state.categories[0]]}));
  assert.throws(() => loadLedger({...state,categories:[{id:'x',kind:'invalid',name:'X'}]}));
  assert.throws(() => loadLedger({...state,rules:[{id:'r',match:'caffè',categoryId:'missing'}]}));
  const rule={id:'r',match:'caffè',categoryId:'dining'};
  assert.throws(() => loadLedger({...state,rules:[rule,rule]}));
});
test('BUG-04: fallimento in apertura non pubblica né sovrascrive il contenuto malformato', async () => {
  const raw={...emptyLedger(),transactions:[row,row]}; const before=JSON.stringify(raw); let writes=0;
  const service=new LedgerService({async load(){return raw;},async save(){writes++;}});
  await assert.rejects(service.init());
  assert.equal(writes,0); assert.equal(JSON.stringify(raw),before);
  assert.deepEqual(service.read(),emptyLedger());
});
test('BUG-04: archivio valido e formato storico restano compatibili senza modifiche al chiamante', () => {
  const state={...emptyLedger(),transactions:[row],cashIncome:{'2026-10-19':0}};
  assert.deepEqual(loadLedger(state).state,state);
  const legacy={...state,version:1,transactions:[row,{origin:'bank',opaque:'inert'}]};
  assert.deepEqual(loadLedger(legacy).state.retiredSimulation,[{origin:'bank',opaque:'inert'}]);
  assert.equal(legacy.transactions.length,2);
});
