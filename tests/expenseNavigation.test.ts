import test from 'node:test';
import assert from 'node:assert/strict';
import { componentHarness, components, elements } from './helpers/componentHarness';
import * as ledger from '../src/domain/ledger';
import { emptyLedger } from '../src/domain/model';

function editor() {
  const state = emptyLedger();
  const alerts: {title: string; buttons?: {text: string; onPress?: () => void}[]}[] = [];
  let blocked = false; let guard: any; let dispatched = 0; let backs = 0;
  let resolve!: () => void; let reject!: (error: Error) => void; let writes = 0;
  const pending = new Promise<void>((ok, fail) => { resolve = ok; reject = fail; });
  const harness = componentHarness(new URL('../src/ui/ExpenseEditor.tsx', import.meta.url), {
    'react-native': { Text: 'Text', Alert: { alert(title: string, _message: string, buttons: any) { alerts.push({title,buttons}); } }, ToastAndroid: { show() {}, SHORT: 0 } },
    'expo-router': { router: { back() { backs++; } }, useNavigation: () => ({ dispatch() { dispatched++; } }) },
    'expo-router/react-navigation': { usePreventRemove(value: boolean, callback: any) { blocked = value; guard = callback; } },
    '../domain/ledger': ledger, './components': components,
    './context': { useRuntime: () => ({ state, busy: false, run: () => { writes++; return pending; } }) },
    './DateField': { DateField: 'DateField' }, './CategoryPicker': { CategoryPicker: 'CategoryPicker' }, './theme': { styles: {} },
  });
  const props = { draft: { description: 'Caffè', cents: 120, categoryId: 'dining', origin: 'card' } };
  const render = () => harness.render('ExpenseEditor', props);
  const save = (tree: any) => elements(tree).find(e => e.type === 'Button' && e.props.title === 'Salva spesa')!.props.onPress();
  return { harness, render, save, alerts, resolve, reject, guard: () => guard({data:{action:{type:'GO_BACK'}}}),
    blocked: () => blocked, dispatched: () => dispatched, backs: () => backs, writes: () => writes };
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('BUG-02: spesa precompilata e salvataggio lento bloccano uscita senza scarto ingannevole', async () => {
  const e = editor(); e.save(e.render()); e.render();
  assert.equal(e.blocked(), true);
  e.guard();
  assert.equal(e.alerts.at(-1)!.title, 'Salvataggio in corso');
  assert.equal(e.alerts.at(-1)!.buttons?.some(b => b.text === 'Esci') ?? false, false);
  assert.equal(e.dispatched(), 0);
  e.save(e.render()); assert.equal(e.writes(), 1);
  e.resolve(); await settled(); e.render(); e.harness.flushEffects();
  assert.equal(e.blocked(), false); assert.equal(e.backs(), 1);
});

test('BUG-02: errore di scrittura lascia il modulo modificabile e permette il nuovo tentativo', async () => {
  const e = editor(); e.save(e.render()); e.reject(new Error('Disco pieno')); await settled();
  const tree = e.render();
  assert.ok(elements(tree).some(el => el.props.children === 'Disco pieno'));
  assert.equal(e.backs(), 0);
  e.save(tree); assert.equal(e.writes(), 2);
  await settled();
});

test('BUG-02: conferma di uscita aperta prima del salvataggio viene ricontrollata al tocco', () => {
  const e = editor(); const tree = e.render();
  elements(tree).find(el => el.type === 'Field' && el.props.label === 'Descrizione (facoltativa)')!.props.onChangeText('Caffè doppio');
  const dirty = e.render(); e.guard();
  const exit = e.alerts.at(-1)!.buttons!.find(b => b.text === 'Esci')!.onPress!;
  e.save(dirty); exit();
  assert.equal(e.dispatched(), 0);
  assert.equal(e.alerts.at(-1)!.title, 'Salvataggio in corso');
});
