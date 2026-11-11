import { requireOptionalNativeModule } from 'expo-modules-core';
import type { LedgerService } from '../../application/ledgerService';
import type { BankAutomation, BankMessage } from '../../domain/fineco';
interface BankNative {
 addListener?(event:string,listener:()=>void):{remove():void};
 configureBankInbox(ticket:number,config:string):Promise<void>;readBankPending(ticket:number):Promise<string>;ackBankPending(ticket:number,ids:string[]):Promise<void>;
 bankInboxStatus():Promise<{enabled:boolean;smsGranted:boolean;gmail:string;lastSync:number;error:string;pending:number}>;
 requestBankSmsPermission():Promise<unknown>;connectBankGmail():Promise<void>;syncBankGmail():Promise<void>;
}
const native=requireOptionalNativeModule<BankNative>('SpeseProfitNative');
export const bankAvailable=typeof native?.configureBankInbox==='function';
function api(){if(!bankAvailable||!native)throw new Error('Aggiorna la build Android per attivare Fineco.');return native;}
let configurationError='';
export async function configureBankInbox(ticket:number,config?:BankAutomation){
 if(!bankAvailable)return;
 try{await api().configureBankInbox(ticket,JSON.stringify(config??null));configurationError='';}
 catch{configurationError='Configurazione Fineco non completata. Lo storico è salvato; riprova Salva configurazione.';}
}
export async function importBankPending(ticket:number,service:LedgerService){
 if(!bankAvailable||!service.read().bankAutomation)return;
 const messages=JSON.parse(await api().readBankPending(ticket)) as BankMessage[];
 if(!Array.isArray(messages))throw new Error('Coda Fineco non valida.');
 if(messages.length){await service.importBankEvents(messages);await api().ackBankPending(ticket,messages.map(m=>m.source+':'+m.id));}
}
export const bankStatus=async()=>{const status=await api().bankInboxStatus();return {...status,error:configurationError||status.error};};
export const requestBankSmsPermission=()=>api().requestBankSmsPermission();
export const connectBankGmail=()=>api().connectBankGmail();
export const syncBankGmail=()=>api().syncBankGmail();

export function onBankInboxChanged(listener:()=>void){return native?.addListener?.('onBankInboxChanged',listener)??{remove(){}};}
