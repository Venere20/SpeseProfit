import test from 'node:test';
import assert from 'node:assert/strict';
import { dayReport, weeklyBars, weekLabel } from '../src/domain/analysis';
import { emptyLedger, cloneLedger, WidgetShortcut } from '../src/domain/model';
import { shortcutFromTemplate, shortcutsFor, validateShortcuts } from '../src/domain/shortcuts';
import { LedgerService } from '../src/application/ledgerService';
import { loadLedger } from '../src/domain/migration';
import { money } from '../src/domain/ledger';
const now=new Date('2026-10-19T12:00:00Z');
test('Analisi giorno: totale, conteggio e tre spese maggiori; nessun incasso giornaliero',()=>{
 const s=emptyLedger();s.cashIncome['2026-10-19']=50000;
 s.transactions=[120,4000,600,2500,900].map((cents,i)=>({id:String(i),origin:'card',date:'2026-10-19',cents:-cents,description:'Spesa',categoryId:'food',classification:'included',manualCategory:true}));
 s.transactions.push({...s.transactions[0]!,id:'excluded',cents:-99000,classification:'excluded'});
 const report=dayReport(s,'2026-10-19');assert.equal(report.count,5);assert.equal(report.cents,8120);assert.deepEqual(report.top.map(t=>t.cents),[-4000,-2500,-900]);assert.equal('income' in report,false);
});
test('Analisi: dati mancanti non diventano bilanci zero e spese future escluse',()=>{
 const s=emptyLedger();s.cashIncome['2026-10-12']=0;s.transactions=[{id:'x',origin:'card',date:'2026-10-20',cents:-500,description:'Futura',categoryId:'food',classification:'included',manualCategory:true}];
 const bars=weeklyBars(s,'2026-10-19',now);assert.equal(bars.length,5);assert.equal(bars[4]!.expenses,0);assert.equal(bars[4]!.balanceState,'incomplete');assert.equal(bars[3]!.balanceState,'even');assert.equal(bars[0]!.weekStart,'2026-09-21');
});
test('Periodi e valuta: confini anno, virgola decimale e segno negativo',()=>{assert.match(weekLabel('2026-12-31'),/2026.*2027/);assert.equal(money(-4250),'−€ 42,50');assert.equal(money(0),'€ 0,00');});
test('Widget: configurazione senza importo valida ma zero e categoria inesistente rifiutati',()=>{
 const s=emptyLedger();const values=shortcutsFor(s);assert.equal(values.length,3);assert.equal(values[0]!.cents,undefined);assert.equal(validateShortcuts(values,s.categories)[0]!.categoryId,'food');
 assert.throws(()=>validateShortcuts(values.map(v=>({...v,cents:0})),s.categories));assert.throws(()=>validateShortcuts(values.map(v=>({...v,categoryId:'missing'})),s.categories));
});
test('Widget: migrazione modelli esistenti e distinzione nome/descrizione',()=>{
 const s=emptyLedger();s.expenseTemplates=[{id:'coffee',cents:120,description:'Caffè',categoryId:'dining',origin:'card'}];s.widgetSlots=['coffee','',''];
 assert.equal(shortcutsFor(s)[0]!.cents,120);const values=shortcutsFor(s);values[0]={...values[0]!,label:'Bar',description:'Descrizione privata'};s.widgetShortcuts=values;
 const loaded=loadLedger(s).state;assert.equal(loaded.widgetShortcuts![0]!.label,'Bar');assert.equal(loaded.widgetShortcuts![0]!.description,'Descrizione privata');
});
test('Widget: salvataggio configurazione cifrabile conserva dati e reset rimuove configurazione',async()=>{
 let stored=emptyLedger();const service=new LedgerService({async load(){return cloneLedger(stored);},async save(s){stored=cloneLedger(s);}});await service.init();const shortcuts:WidgetShortcut[]=shortcutsFor(stored);shortcuts[0]={...shortcuts[0]!,cents:120,description:'Privata'};await service.configureWidgetShortcuts(shortcuts);
 assert.equal(stored.widgetShortcuts![0]!.description,'Privata');await service.reset();assert.equal(stored.widgetShortcuts,undefined);
});
test('Widget: scrittura fallita non pubblica nuova configurazione',async()=>{
 const service=new LedgerService({async load(){return emptyLedger();},async save(){throw new Error('disco pieno');}});await service.init();await assert.rejects(service.configureWidgetShortcuts(shortcutsFor(emptyLedger())));assert.equal(service.read().widgetShortcuts,undefined);
});

test('Widget: vecchi modelli automatici mantengono categoria descrittiva',()=>{
 const s=emptyLedger();s.expenseTemplates=[{id:'coffee',description:'Caffè',cents:120,categoryId:'',origin:'card'}];s.widgetSlots=['coffee','',''];assert.equal(shortcutsFor(s)[0]!.categoryId,'dining');
});

test('Widget: scelta di un modello automatico risolve categoria e regole senza ereditare il riquadro',async()=>{
 const state=emptyLedger();const model={id:'coffee',description:'Caffè',cents:120,categoryId:'',origin:'card' as const};
 const shortcut=shortcutFromTemplate(state,model);assert.equal(shortcut.categoryId,'dining');assert.equal(shortcut.label,'Caffè');assert.equal(shortcut.cents,120);
 const configured=shortcutsFor(state);configured[0]={...configured[0]!,...shortcut};
 let stored=state;const service=new LedgerService({async load(){return cloneLedger(stored);},async save(next){stored=cloneLedger(next);}});await service.init();await service.configureWidgetShortcuts(configured);
 assert.equal(loadLedger(stored).state.widgetShortcuts![0]!.categoryId,'dining');
 state.rules.push({id:'rule',match:'caffè',categoryId:'leisure'});
 assert.equal(shortcutFromTemplate(state,model).categoryId,'leisure');
 assert.equal(shortcutFromTemplate(state,{...model,categoryId:'transport'}).categoryId,'transport');
 assert.equal(model.categoryId,'');
});
