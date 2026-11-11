import test from 'node:test';
import assert from 'node:assert/strict';
import { componentHarness, components, elements } from './helpers/componentHarness';
import * as ledger from '../src/domain/ledger';
import * as analysis from '../src/domain/analysis';
import { emptyLedger } from '../src/domain/model';

test('BUG-01: incasso aperto domenica resta nella settimana iniziale dopo mezzanotte', async () => {
  let now = new Date('2026-10-25T22:59:50Z');
  const state = emptyLedger();
  state.cashIncome['2026-10-19'] = 25000;
  state.cashIncome['2026-10-26'] = 10000;
  let target = '';
  let backs = 0;
  const harness = componentHarness(new URL('../app/incasso.tsx', import.meta.url), {
    'expo-router': { router: { back() { backs++; } }, useLocalSearchParams: () => ({}) },
    'react-native': { Text: 'Text', ToastAndroid: { show() {}, SHORT: 0 } },
    '../src/domain/ledger': { ...ledger, romeDate: () => ledger.romeDate(now) },
    '../src/domain/analysis': analysis,
    '../src/ui/components': components,
    '../src/ui/context': { useRuntime: () => ({ state, busy: false, run: async (operation: any) => operation({
      setWeeklyCashIncome(week: string, cents: number) { target = week; state.cashIncome[week] = cents; },
    }) }) },
    '../src/ui/theme': { styles: {} },
  });
  const first = harness.render();
  elements(first).find(e => e.type === 'Field')!.props.onChangeText('500');
  now = new Date('2026-10-25T23:00:05Z');
  const afterMidnight = harness.render();
  elements(afterMidnight).find(e => e.type === 'Button' && e.props.title.includes('totale'))!.props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(target, '2026-10-19');
  assert.equal(state.cashIncome['2026-10-19'], 50000);
  assert.equal(state.cashIncome['2026-10-26'], 10000);
  assert.equal(backs, 1);
});
