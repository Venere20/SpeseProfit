import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLedger, cloneLedger, LedgerState } from '../src/domain/model';
import { accumulatedReport, weeklyReport, validateReminder } from '../src/domain/progress';
import { loadLedger } from '../src/domain/migration';
import { LedgerService } from '../src/application/ledgerService';
const now = new Date('2026-10-18T12:00:00Z');
function example() {
  const s = emptyLedger(); s.cashIncome = { '2026-09-28': 30000, '2026-10-05': 0, '2026-10-12': 20000 };
  for (const [date, cents] of [['2026-09-30',12000],['2026-10-06',8000],['2026-10-15',15000]] as const) s.transactions.push({ id: date, date, cents: -cents, description: 'Spesa', categoryId: 'food', origin: 'card', classification: 'included', manualCategory: true });
  return s;
}
test('accumulato: settimane con zero confermato, totali e andamento attraversano i mesi', () => {
  const report = accumulatedReport(example(), undefined, now);
  assert.equal(report.income,50000); assert.equal(report.expenses,35000); assert.equal(report.balance,15000);
  assert.deepEqual(report.rows.map(r => r.accumulated), [18000,10000,15000]); assert.deepEqual(report.missingWeeks,[]);
});
test('incasso mancante resta distinto dallo zero, anche nelle settimane senza movimenti', () => {
  const s=example(); delete s.cashIncome['2026-10-05'];
  const report=accumulatedReport(s,undefined,now); assert.deepEqual(report.missingWeeks,['2026-10-05']); assert.equal(report.expenses,35000);
  const w=weeklyReport(s,'2026-10-05',now); assert.equal(w.total.hasCashIncome,false); assert.equal(w.total.balance,-8000);
  s.cashIncome['2026-10-05']=0; assert.equal(weeklyReport(s,'2026-10-05',now).total.balanceState,'negative');
});
test('accumulato: periodo scelto, settimane vuote, trasferimenti e date future', () => {
  const s=example(); s.cashIncome['2026-10-19']=99999;
  s.transactions.push({ ...s.transactions[0]!, id:'future',date:'2026-10-19',cents:-88888 }, { ...s.transactions[0]!,id:'transfer',classification:'transfer',cents:-77777 });
  const r=accumulatedReport(s,'2026-10-05',now); assert.equal(r.balance,-3000); assert.equal(r.rows.length,2);
  const withGap=accumulatedReport(s,'2026-09-21',now); assert.deepEqual(withGap.missingWeeks,['2026-09-21']);
  assert.throws(()=>accumulatedReport(s,'2026-10-19',now)); assert.throws(()=>accumulatedReport(s,'2026-10-06',now));
  assert.equal(accumulatedReport(emptyLedger(),undefined,now).hasData,false);
});
test('settimana in corso confronta spese agli stessi giorni, quella chiusa alla precedente intera', () => {
  const s=example(); s.transactions.push({ ...s.transactions[0]!,id:'late',date:'2026-10-09',cents:-9000 });
  const current=weeklyReport(s,'2026-10-12',new Date('2026-10-15T12:00:00Z'));
  assert.equal(current.previousEnd,'2026-10-08'); assert.equal(current.expenseDelta,7000);
  assert.equal(weeklyReport(s,'2026-10-12',new Date('2026-10-19T12:00:00Z')).expenseDelta,-2000);
});
test('stato precedente resta compatibile e preferenze persistono senza registrare movimenti',async()=>{
  let stored: LedgerState=example(); const before=cloneLedger(stored);
  const service=new LedgerService({ async load(){return stored;},async save(s){stored=cloneLedger(s);} },()=>now); await service.init();
  await service.setAccumulationStart('2026-10-05'); await service.setDailyReminder({enabled:true,hour:21,minute:30}); await service.completeToday(true);
  const loaded=loadLedger(stored).state; assert.deepEqual(loaded.transactions,before.transactions); assert.deepEqual(loaded.cashIncome,before.cashIncome);
  assert.deepEqual(loaded.completedDays,['2026-10-18']); assert.equal(loaded.dailyReminder?.hour,21); assert.equal(loaded.accumulationStart,'2026-10-05');
  await service.completeToday(false); assert.deepEqual(service.read().completedDays,[]); await service.setAccumulationStart(); assert.equal(service.read().accumulationStart,undefined);
  await service.reset(); assert.equal(service.read().dailyReminder,undefined); assert.equal(service.read().completedDays,undefined);
});
test('preferenze e giornate malformate vengono rifiutate nel caricamento',()=>{
  for(const value of [{enabled:true,hour:24,minute:0},{enabled:'yes',hour:12,minute:30},{enabled:true,hour:12,minute:0.5}]) assert.throws(()=>validateReminder(value));
  assert.throws(()=>loadLedger({...example(), completedDays:['2026-02-30']}));
  assert.throws(()=>loadLedger({...example(),completedDays:['2026-10-18','2026-10-18']}));
  assert.throws(()=>loadLedger({...example(),accumulationStart:'2026-10-06'}));
  assert.equal(loadLedger(emptyLedger()).migrated,false);
});
test('scrittura fallita non pubblica completamento e impostazioni',async()=>{
  const service=new LedgerService({async load(){return example();},async save(){throw new Error('disco');}},()=>now); await service.init();
  await assert.rejects(service.completeToday(true)); await assert.rejects(service.setDailyReminder({enabled:true,hour:21,minute:0}));
  assert.equal(service.read().completedDays,undefined); assert.equal(service.read().dailyReminder,undefined);
});
