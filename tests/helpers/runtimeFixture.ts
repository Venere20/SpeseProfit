import { componentHarness } from './componentHarness';
import { LedgerService } from '../../src/application/ledgerService';
import { emptyLedger, WidgetSnapshot } from '../../src/domain/model';
import * as ledger from '../../src/domain/ledger';
import * as session from '../../src/domain/session';

export async function runtimeFixture() {
  let now = new Date('2026-10-21T21:59:50Z');
  const intervals: (() => void)[] = [];
  const published: WidgetSnapshot[] = [];
  let failPublish = false;
  const state = emptyLedger(); state.cashIncome['2026-10-19'] = 10000;
  state.transactions.push({id:'future',origin:'card',date:'2026-10-22',cents:-15000,description:'Spesa',categoryId:'food',classification:'included',manualCategory:true});
  const service = new LedgerService({ async load() { return state; }, async save() {} });
  await service.init();
  const harness = componentHarness(new URL('../../src/ui/context.tsx', import.meta.url), {
    '../adapters/native/bank': {importBankPending:async()=>{},syncBankGmail:async()=>{},onBankInboxChanged:()=>({remove(){}})},
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({remove() {}}) }, Platform: { OS: 'android' } },
    '../application/ledgerService': { LedgerService },
    '../domain/ledger': {...ledger, romeDate: () => ledger.romeDate(now), widgetSnapshot: (s: any) => ledger.widgetSnapshot(s, now)},
    '../domain/session': session,
    '../adapters/native/widget': { publishNativeWidget: async (snapshot: WidgetSnapshot) => { if (failPublish) throw new Error('Pubblicazione fallita'); published.push(snapshot); } },
    '../adapters/native/vault': { protectedVaultAvailable: true, sessionRetentionAvailable: true, vaultStatus: async () => 'ready', getProtectedSessionTimeout: async () => 0, lockProtectedVault: async () => {}, openProtectedVault: async () => ({service,ticket:1}) },
  }, { performance, setTimeout, setInterval: (fn: () => void) => {intervals.push(fn); return intervals.length;}, clearInterval() {} });
  const render = () => { const tree = harness.render('RuntimeProvider', {children:null}); harness.flushEffects(); return tree.props.value; };
  render(); await new Promise(resolve => setImmediate(resolve));
  await render().openVault('ignored synthetic fixture', false);
  render(); await new Promise(resolve => setImmediate(resolve));
  return { render, published, setNow(value: string) { now = new Date(value); }, tick() { for (const fn of intervals) fn(); }, failPublish(value: boolean) { failPublish = value; } };
}
