import { assertCents, categoryFor, romeDate, validateDate, weekOf } from './ledger';
import { LedgerState } from './model';
export interface BankMessage { id:string; source:'sms'|'gmail'; sender:string; receivedAt:number; body:string; subject?:string }
export interface BankEvent { id:string; source:'sms'|'gmail'; status:'authorized'|'submitted'|'executed'|'rejected'|'cancelled'; date:string; dateOrigin:'bank'|'message'; cents:number; counterparty:string }
export interface BankReview { message:BankMessage; reason:string; event?:BankEvent }
export interface BankAutomation { activatedAt:number; smsSender:string; owner:string }
export function validateBankMessage(m:BankMessage) {
 if(!m || !['sms','gmail'].includes(m.source)||typeof m.id!=='string'||!m.id||m.id.length>512||typeof m.sender!=='string'||typeof m.body!=='string'||m.body.length>32768||!Number.isSafeInteger(m.receivedAt)||m.receivedAt<0||(m.subject!==undefined&&typeof m.subject!=='string'))throw new Error('Avviso bancario non valido.');
 romeDate(new Date(m.receivedAt));return m;
}
function amount(raw:string) {
 let s=raw.trim();if(/^\d{1,9}[.,]\d{2}$/.test(s))s=s.replace(',','.');
 else if(/^\d{1,3}(?:\.\d{3})+,\d{2}$/.test(s))s=s.replaceAll('.','').replace(',','.');
 else if(/^\d{1,3}(?:,\d{3})+\.\d{2}$/.test(s))s=s.replaceAll(',','');
 else throw new Error('Importo non riconosciuto.');
 const [whole,decimal]=s.split('.');const cents=Number(whole)*100+Number(decimal);assertCents(cents,false);return cents;
}
export function parseFineco(m:BankMessage,config:BankAutomation):BankEvent|null {
 validateBankMessage(m);if(m.receivedAt<config.activatedAt)return null;
 const text=m.body.replace(/\r/g,'');let status:BankEvent['status'];let incoming=false;let counterparty='';
 if(m.source==='sms'){
  if(m.sender!==config.smsSender)return null;
  if(!/^Fineco\s*-\s*SMS Gratuito:\s*Autorizzato utilizzo Carta\s+\*+\d{4}/i.test(text))return null;
  status='authorized';counterparty=text.match(/per:\s*(.+?)(?:\.\s*Info:|$)/i)?.[1]?.trim()??'';
 }else{
  if(m.sender.toLowerCase()!=='service@finecobank.com')return null;
  if(!/bonifico/i.test(m.subject??''))return null;
  if(!/^Fineco:\s*bonifico(?:(?: istantaneo)? in (?:ingresso|uscita)| annullato)\.?$/i.test((m.subject??'').trim()))throw new Error('Tipo di avviso Fineco da verificare.');
  incoming=/bonifico(?: istantaneo)? in ingresso/i.test(m.subject??'');
  status=/stato annullato correttamente/i.test(text)?'cancelled':/stato rifiutato dalla banca/i.test(text)?'rejected':/stato immesso/i.test(text)?'submitted':/eseguito correttamente|provveduto ad accreditare/i.test(text)?'executed':(()=>{throw new Error('Esito del bonifico da verificare.');})();
  counterparty=(incoming?text.match(/Ordinante:\s*([^\n]+)/i):text.match(/beneficiario:\s*([^\n]+)/i)??text.match(/a favore di\s+([^\n]+)/i))?.[1]?.trim().replace(/\.$/,'')??'';
 }
 const match=text.match(/Importo:\s*([\d.,]+)\s*([A-Z]{3})/i);
 if(!match||match[2]?.toUpperCase()!=='EUR'||!counterparty||counterparty.length>200)throw new Error('Importo, valuta o controparte da verificare.');
 let date=romeDate(new Date(m.receivedAt));let dateOrigin:BankEvent['dateOrigin']='message';
 const d=text.match(/(?:Data accredito|Data inserimento|data operazione):\s*(\d{2})[/-](\d{2})[/-](\d{4})/i);
 if(d){date=validateDate(`${d[3]}-${d[2]}-${d[1]}`);dateOrigin='bank';}
 return{id:m.source+':'+m.id,source:m.source,status,date,dateOrigin,cents:amount(match[1]!)*(incoming?1:-1),counterparty};
}
function canonical(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' ');}
export function applyBankMessages(s:LedgerState,messages:BankMessage[]) {
 if(!s.bankAutomation)throw new Error('Attiva prima le automazioni Fineco.');
 for(const m of messages){
  validateBankMessage(m);const id=m.source+':'+m.id;if(s.importedBankIds?.includes(id))continue;
  let event:BankEvent|null;let reason='';
  try{event=parseFineco(m,s.bankAutomation);}catch(e){event=null;reason=(e as Error).message;}
  if(event?.status==='executed'&&s.transactions.some(t=>t.bankEvent?.status==='submitted'&&t.cents===event!.cents&&t.description===event!.counterparty))reason='Possibile conferma di un bonifico provvisorio: verifica il collegamento.';
  if(event&&['cancelled','rejected'].includes(event.status))reason='Abbina questo esito: manca un riferimento bancario univoco.';
  if(event&&!reason&&m.source==='gmail'&&canonical(event.counterparty)===canonical(s.bankAutomation.owner))reason='Possibile giroconto: scegli la classificazione.';
  if(reason)(s.bankReview??=[]).push({message:m,reason,...(event?{event}:{})});
  else if(event){
   s.transactions.push({id:'fineco:'+id,origin:event.source==='sms'?'card':'account',date:event.date,cents:event.cents,description:event.counterparty,categoryId:event.cents>0?'income':categoryFor(s,event.counterparty,event.cents),classification:'included',manualCategory:false,bankEvent:event});
   if(event.cents>0&&Object.hasOwn(s.cashIncome,weekOf(event.date)))s.bankIncomeReviewWeeks=[...new Set([...(s.bankIncomeReviewWeeks??[]),weekOf(event.date)])];
  }
  (s.importedBankIds??=[]).push(id);
 }
 return s;
}
export function validateBankData(raw:Record<string,unknown>) {
 const automation=raw.bankAutomation as BankAutomation|undefined;
 if(automation&&(!Number.isSafeInteger(automation.activatedAt)||automation.activatedAt<0||typeof automation.smsSender!=='string'||!automation.smsSender.trim()||automation.smsSender.length>80||typeof automation.owner!=='string'||!automation.owner.trim()||automation.owner.length>100))throw new Error('Configurazione Fineco non valida.');
 const ids=raw.importedBankIds as string[]|undefined;
 if(ids&&(!Array.isArray(ids)||ids.some(i=>typeof i!=='string'||!i||i.length>520)||new Set(ids).size!==ids.length))throw new Error('Registro Fineco non valido.');
 const review=raw.bankReview as BankReview[]|undefined;
 if(review){if(!Array.isArray(review))throw new Error('Avvisi non validi.');for(const item of review){validateBankMessage(item.message);if(typeof item.reason!=='string')throw new Error('Avviso non valido.');}}
 for(const t of (raw.transactions as {bankEvent?:BankEvent}[]??[])){if(t.bankEvent){const e=t.bankEvent;if(!['sms','gmail'].includes(e.source)||!['authorized','submitted','executed','rejected','cancelled'].includes(e.status)||!['bank','message'].includes(e.dateOrigin)||typeof e.id!=='string'||!e.id||typeof e.counterparty!=='string')throw new Error('Provenienza bancaria non valida.');validateDate(e.date);assertCents(Math.abs(e.cents),false);}}
 const weeks=raw.bankIncomeReviewWeeks as string[]|undefined;
 if(weeks){if(!Array.isArray(weeks)||weeks.some(w=>weekOf(w)!==w))throw new Error('Settimane non valide.');}
 return {...(automation?{bankAutomation:automation}:{}),...(ids?{importedBankIds:ids}:{}),...(review?{bankReview:review}:{}),...(weeks?{bankIncomeReviewWeeks:weeks}:{})};
}
