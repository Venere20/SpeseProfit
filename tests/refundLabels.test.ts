import test from 'node:test';
import assert from 'node:assert/strict';
import { componentHarness, components, elements } from './helpers/componentHarness';
import { emptyLedger, Transaction } from '../src/domain/model';
import * as ledger from '../src/domain/ledger';
import * as credits from '../src/domain/credits';

function refundText(editing: boolean, amount = 2500) {
  const expense: Transaction = {id:'expense',origin:'card',date:'2026-10-19',cents:-10000,description:'Spesa',categoryId:'food',classification:'included',manualCategory:true};
  const refund: Transaction = {id:'refund',kind:'refund',refundFor:'expense',origin:'card',date:'2026-10-20',cents:amount,description:'Rimborso',categoryId:'refund',classification:'included',manualCategory:true};
  const state={...emptyLedger(),transactions:[expense,refund]};
  const h=componentHarness(new URL('../src/ui/CreditForms.tsx',import.meta.url),{
    'react-native':{Text:'Text',Alert:{}},'expo-router':{router:{},useNavigation:()=>({})},
    'expo-router/react-navigation':{usePreventRemove(){}},
    '../domain/credits':credits,'../domain/ledger':ledger,
    './context':{useRuntime:()=>({state,busy:false,run:async()=>{}})},
    './components':{...components,EmptyState:'EmptyState',Sheet:'Sheet'},'./DateField':{DateField:'DateField'},'./theme':{styles:{}},
  });
  const tree=h.render('RefundForm',editing?{item:refund}:{expenseId:'expense'});
  return elements(tree).filter(e=>e.type==='Text').map(e=>[e.props.children].flat(Infinity).join('')).join('\n');
}
test('UI-02: modifica distingue massimo sostitutivo 100 euro e residuo effettivo 75 euro',()=>{
  const text=refundText(true);
  assert.ok(text.includes('Importo massimo per questo rimborso: '+ledger.money(10000)));
  assert.ok(text.includes('Ancora rimborsabile: '+ledger.money(7500)));
});
test('UI-02: creazione usa il residuo e rimborso completo indica zero ancora disponibile',()=>{
  assert.ok(refundText(false).includes('Ancora rimborsabile: '+ledger.money(7500)));
  const text=refundText(true,10000);
  assert.ok(text.includes('Ancora rimborsabile: '+ledger.money(0)));
  assert.ok(text.includes('Importo massimo per questo rimborso: '+ledger.money(10000)));
});
