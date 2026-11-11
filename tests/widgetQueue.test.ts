import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerService } from '../src/application/ledgerService';
import { cloneLedger, emptyLedger } from '../src/domain/model';
import { loadLedger } from '../src/domain/migration';
import { summary } from '../src/domain/ledger';
import { validateWidgetSlots } from '../src/domain/widgetQueue';
const id='widget:12345678-1234-1234-1234-123456789012';
const template={id:'coffee',description:'Caffè',cents:120,categoryId:'',origin:'card' as const};
const item={id,date:'2026-10-18',occurredAt:Date.parse('2026-10-18T21:50:00Z'),template};
function setup(initial=emptyLedger()){
  let stored=cloneLedger(initial);
  const service=new LedgerService({async load(){return cloneLedger(stored);},async save(s){stored=cloneLedger(s);}},()=>new Date('2026-10-19T12:00:00Z'));
  return {service,read:()=>cloneLedger(stored)};
}
test('widget importa il modello al tocco con data originale della domenica, non del successivo sblocco',async()=>{
  const {service}=setup(); await service.init(); await service.importWidgetExpenses([item]);
  const s=service.read();assert.equal(s.transactions[0]!.date,'2026-10-18');assert.equal(s.transactions[0]!.cents,-120);
  assert.equal(s.transactions[0]!.categoryId,'dining');assert.equal(summary(s,'2026-10-12').expenses,120);assert.equal(summary(s,'2026-10-19').expenses,0);
});
test('riapertura dopo salvataggio senza ack non duplica, nemmeno dopo cancellazione della spesa',async()=>{
  const first=setup();await first.service.init();await first.service.importWidgetExpenses([item]);
  const second=setup(loadLedger(first.read()).state);await second.service.init();await second.service.importWidgetExpenses([item,item]);
  assert.equal(second.service.read().transactions.length,1);
  await second.service.deleteExpense(id);await second.service.importWidgetExpenses([item]);assert.equal(second.service.read().transactions.length,0);
});
test('importo e campi originali restano quelli del modello accodato anche dopo modifica o eliminazione del modello',async()=>{
  const s=emptyLedger();s.expenseTemplates=[{...template,cents:500}];const {service}=setup(s);await service.init();await service.deleteExpenseTemplate('coffee');
  await service.importWidgetExpenses([item]);assert.equal(service.read().transactions[0]!.cents,-120);assert.equal(service.read().transactions[0]!.origin,'card');
});
test('scrittura fallita non inserisce spesa o identificativo da confermare',async()=>{
  const service=new LedgerService({async load(){return emptyLedger();},async save(){throw new Error('disco pieno');}});await service.init();
  await assert.rejects(service.importWidgetExpenses([item]));assert.equal(service.read().transactions.length,0);assert.equal(service.read().importedWidgetIds,undefined);
});
test('configurazione di tre modelli, duplicati rifiutati, cancellazione modello svuota solo quel riquadro',async()=>{
  const s=emptyLedger();s.expenseTemplates=[template];const {service}=setup(s);await service.init();
  await service.configureWidgetSlots(['coffee','','']);assert.deepEqual(service.read().widgetSlots,['coffee','','']);
  await assert.rejects(service.configureWidgetSlots(['unknown','','']));assert.throws(()=>validateWidgetSlots(['coffee','coffee','']));assert.throws(()=>validateWidgetSlots([]));
  await service.deleteExpenseTemplate('coffee');assert.deepEqual(service.read().widgetSlots,['','','']);
});
test('dati widget persistono in archivi precedenti compatibili e il reset rimuove preferenze e registro importazioni',async()=>{
  const s=emptyLedger();s.expenseTemplates=[template];const {service,read}=setup(s);await service.init();await service.configureWidgetSlots(['coffee','','']);await service.importWidgetExpenses([item]);
  const loaded=loadLedger(read()).state;assert.deepEqual(loaded.widgetSlots,['coffee','','']);assert.deepEqual(loaded.importedWidgetIds,[id]);
  await service.reset();assert.equal(service.read().widgetSlots,undefined);assert.equal(service.read().importedWidgetIds,undefined);
});
test('richieste non valide o date incoerenti non producono importazioni parziali',async()=>{
  const {service}=setup();await service.init();await assert.rejects(service.importWidgetExpenses([item,{...item,id:'bad'}]));
  await assert.rejects(service.importWidgetExpenses([{...item,date:'2026-10-19'}]));
  await assert.rejects(service.importWidgetExpenses([{...item,template:{...template,cents:-120}}]));assert.equal(service.read().transactions.length,0);
});
