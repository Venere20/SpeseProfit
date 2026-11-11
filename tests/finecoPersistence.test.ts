import test from 'node:test';
import assert from 'node:assert/strict';
import {componentHarness} from './helpers/componentHarness';
import {emptyLedger} from '../src/domain/model';
import * as model from '../src/domain/model';
import * as session from '../src/domain/session';
import {LedgerService} from '../src/application/ledgerService';

test('Errore configurazione nativa dopo commit non presenta un salvataggio riuscito come fallito',async()=>{
 let stored=JSON.stringify(emptyLedger());
 const native={async configureBankInbox(){throw new Error('Preferenze non disponibili');},async bankInboxStatus(){return {enabled:false,smsGranted:false,gmail:'',lastSync:0,error:'',pending:0};},async vaultStatus(){return 'ready';},async createVault(){return 1;},async unlockVault(){return 1;},async lockVault(){},async touchVault(){},async readVault(){return stored;},async writeVault(_ticket:number,json:string){stored=json;},async changeVaultPassword(){}};
 const bank=componentHarness(new URL('../src/adapters/native/bank.ts',import.meta.url),{'expo-modules-core':{requireOptionalNativeModule:()=>native}}).exports;
 const vault=componentHarness(new URL('../src/adapters/native/vault.ts',import.meta.url),{'./bank':bank,'react-native':{Platform:{OS:'android'}},'expo-modules-core':{requireOptionalNativeModule:()=>native},'../../domain/model':model,'../../domain/session':session,'../../application/ledgerService':{LedgerService}}).exports;
 const opened=await vault.openProtectedVault('synthetic password',false);
 await opened.service.addExpense({date:'2026-11-05',cents:500,description:'Spesa fittizia',origin:'card',categoryId:'food'});
 assert.equal(opened.service.read().transactions.length,1);assert.equal(JSON.parse(stored).transactions.length,1);
 assert.match((await bank.bankStatus()).error,/Lo storico è salvato/);
});
