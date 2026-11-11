import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFineco } from '../src/domain/fineco';
import { emptyLedger, cloneLedger } from '../src/domain/model';
import { LedgerService } from '../src/application/ledgerService';
import { summary } from '../src/domain/ledger';
import { monthlySummary } from '../src/domain/monthly';
const config={activatedAt:1,smsSender:'Fineco',owner:'Persona Prova'};
const sms={id:'one',source:'sms' as const,sender:'Fineco',receivedAt:Date.parse('2026-11-03T12:00:00Z'),body:"Fineco - SMS Gratuito: Autorizzato utilizzo Carta ***1111 Importo: 5.00 EUR, per: NEGOZIO D'ARTICOLI. Info: 0228992899."};
const mail={id:'mail',source:'gmail' as const,sender:'service@finecobank.com',receivedAt:sms.receivedAt,subject:'Fineco: bonifico istantaneo in ingresso',body:'Abbiamo provveduto ad accreditare il bonifico.\nOrdinante: Persona Esterna\nImporto: 100.00 EUR'};
test('SMS: importo preciso, apostrofi, mittente, zero e OTP',()=>{
 assert.equal(parseFineco(sms,config)?.cents,-500);assert.equal(parseFineco(sms,config)?.counterparty,"NEGOZIO D'ARTICOLI");
 assert.equal(parseFineco({...sms,sender:'Altro'},config),null);assert.equal(parseFineco({...sms,body:'Codice OTP: 123456'},config),null);
 assert.throws(()=>parseFineco({...sms,body:sms.body.replace('5.00','0.00')},config));
 assert.equal(parseFineco({...sms,body:sms.body.replace('5.00','5,50')},config)?.cents,-550);
});
test('Email: esito negativo prima di oggetto, data bancaria e inserimento',()=>{
 assert.equal(parseFineco(mail,config)?.cents,10000);
 assert.throws(()=>parseFineco({...mail,subject:'Fineco: avviso sicurezza bonifico'},config));
 const outgoing={...mail,subject:'Fineco: bonifico istantaneo in uscita.',body:'Il bonifico e stato rifiutato dalla banca del beneficiario.\nBeneficiario: Persona Esterna\nData accredito: 03-11-2026\nImporto: 5.00 EUR'};
 assert.equal(parseFineco(outgoing,config)?.status,'rejected');assert.equal(parseFineco(outgoing,config)?.dateOrigin,'bank');
 assert.equal(parseFineco({...outgoing,body:outgoing.body.replace('rifiutato dalla banca del beneficiario','immesso')},config)?.status,'submitted');
});
test('Importazione durevole, duplicati, operazioni uguali distinte e totale manuale',async()=>{
 let stored=emptyLedger();const service=new LedgerService({async load(){return cloneLedger(stored);},async save(s){stored=cloneLedger(s);}});
 await service.init();await service.configureBankAutomation(config);await service.setWeeklyCashIncome('2026-11-02',80000);
 await service.importBankEvents([sms,mail,mail,{...sms,id:'two'}]);
 assert.equal(service.read().transactions.length,3);assert.equal(summary(service.read(),'2026-11-02').income,80000);
 assert.equal(monthlySummary(service.read(),'2026-11').income,80000);assert.deepEqual(service.read().bankIncomeReviewWeeks,['2026-11-02']);
 await service.deleteExpense('fineco:sms:one');await service.importBankEvents([sms]);assert.equal(service.read().transactions.length,2);
 const reopened=new LedgerService({async load(){return cloneLedger(stored);},async save(){}});await reopened.init();assert.equal(reopened.read().importedBankIds?.length,3);
});
test('Giroconti, annullamenti e formati ambigui richiedono verifica',async()=>{
 const service=new LedgerService({async load(){return emptyLedger();},async save(){}});await service.init();await service.configureBankAutomation(config);
 await service.importBankEvents([{...mail,body:mail.body.replace('Persona Esterna','Prova Persona')},{...sms,id:'zero',body:sms.body.replace('5.00','0.00')}]);
 assert.equal(service.read().transactions.length,0);assert.equal(service.read().bankReview?.length,2);
});
test('Scrittura fallita non consuma identificativi',async()=>{
 let fail=false;const service=new LedgerService({async load(){return emptyLedger();},async save(){if(fail)throw new Error('disco pieno');}});await service.init();await service.configureBankAutomation(config);fail=true;
 await assert.rejects(service.importBankEvents([sms]));assert.equal(service.read().importedBankIds,undefined);assert.equal(service.read().transactions.length,0);
});

test('Zero manuale, confine mese e reset non riattivano vecchi avvisi',async()=>{
 const service=new LedgerService({async load(){return emptyLedger();},async save(){}});await service.init();await service.configureBankAutomation(config);
 const boundary={...mail,receivedAt:Date.parse('2026-11-01T12:00:00Z')};await service.importBankEvents([boundary]);
 assert.equal(monthlySummary(service.read(),'2026-11').income,10000);
 await service.setWeeklyCashIncome('2026-10-26',0);assert.equal(summary(service.read(),'2026-10-26').income,0);assert.equal(monthlySummary(service.read(),'2026-11').income,0);
 await service.reset();assert.equal(service.read().bankAutomation,undefined);assert.equal(service.read().importedBankIds,undefined);await assert.rejects(service.importBankEvents([mail]));
 await service.configureBankAutomation({...config,activatedAt:mail.receivedAt+1});await service.importBankEvents([mail]);assert.equal(service.read().transactions.length,0);
});
