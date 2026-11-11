import test from 'node:test';
import assert from 'node:assert/strict';
import { componentHarness, components } from './helpers/componentHarness';
import * as ledger from '../src/domain/ledger';
import * as monthly from '../src/domain/monthly';
import * as reports from '../src/domain/reports';
import * as calendar from '../src/domain/calendar';
import { emptyLedger } from '../src/domain/model';

test('UI-04: anni fuori intervallo sono rifiutati, estremi e bisestili restano validi',()=>{
  assert.throws(()=>monthly.monthStart('0000-01'));
  assert.throws(()=>monthly.monthStart('9999-12'));
  assert.throws(()=>monthly.shiftMonth('0001-01',-1));
  assert.throws(()=>monthly.shiftMonth('9998-12',1));
  assert.equal(monthly.monthEnd('0001-01'),'0001-01-31');
  assert.equal(monthly.monthEnd('9998-12'),'9998-12-31');
  assert.equal(monthly.monthEnd('2024-02'),'2024-02-29');
  assert.equal(monthly.monthEnd('2026-02'),'2026-02-28');
  assert.doesNotThrow(()=>reports.annualSummary(emptyLedger(),1));
  assert.doesNotThrow(()=>reports.annualSummary(emptyLedger(),9998));
});
test('UI-04: collegamenti con mese non confrontabile usano un fallback senza errore',()=>{
  for(const month of ['0000-01','0001-01','9999-12','2026-99','invalid']){
    const h=componentHarness(new URL('../app/confronto.tsx',import.meta.url),{
      'expo-router':{router:{},useLocalSearchParams:()=>({month})},'react-native':{Text:'Text',View:'View'},
      '../src/domain/calendar':calendar,'../src/domain/ledger':ledger,'../src/domain/monthly':monthly,'../src/domain/reports':reports,
      '../src/ui/components':components,'../src/ui/context':{useRuntime:()=>({state:emptyLedger()})},'../src/ui/theme':{colors:{},styles:{}},
    });
    const route=h.render();
    assert.notEqual(route.props.initialMonth,month);
    assert.doesNotThrow(()=> (route.type as (p: any)=>unknown)(route.props));
  }
});
