
import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeFixture } from './helpers/runtimeFixture';

test('UI-03: pubblicazione riuscita e fallita espongono esiti distinti dalla coda', async () => {
  const f = await runtimeFixture();
  assert.equal(f.render().widgetPublishError, false);
  const stamp = f.published.at(-1)!.calculatedAt;
  assert.equal(f.render().publishedWidgetSnapshot.calculatedAt,stamp);
  f.tick();f.render();assert.equal(f.render().publishedWidgetSnapshot.calculatedAt,stamp);
  f.failPublish(true); f.setNow('2026-10-21T22:00:01Z'); f.tick(); f.render();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.render().widgetPublishError, true);
  assert.equal(f.published.at(-1)!.calculatedAt, stamp);
  assert.equal(f.render().publishedWidgetSnapshot.calculatedAt,stamp);
});

test('UI-03: la pagina non spaccia l’orologio locale per conferma del widget Android', async () => {
  const {componentHarness,components,elements}=await import('./helpers/componentHarness');
  const {emptyLedger}=await import('../src/domain/model');
  const ledger=await import('../src/domain/ledger');
  const shortcuts=await import('../src/domain/shortcuts');
  const analysis=await import('../src/domain/analysis');
  const state=emptyLedger();
  const stamp='2026-10-21T12:34:00.000Z';
  const timers:(()=>void)[]=[];
  const h=componentHarness(new URL('../app/widget.tsx',import.meta.url),{
    'react-native':{Text:'Text',View:'View',Pressable:'Pressable',ToastAndroid:{}},
    '../src/domain/ledger':ledger,'../src/domain/shortcuts':shortcuts,'../src/domain/analysis':analysis,
    '../src/ui/components':components,'../src/ui/CategoryPicker':{CategoryPicker:'CategoryPicker'},
    '../src/ui/Icon':{Icon:'Icon',shortcutIcon:()=>''},
    '../src/ui/context':{useRuntime:()=>({state,busy:false,publishedWidgetSnapshot:{weekStart:'2026-10-19',balanceState:'incomplete',calculatedAt:stamp},widgetPublishError:false})},
    '../src/ui/theme':{colors:{},styles:{}},
    '../src/adapters/native/widget':{widgetQueueStatus:async()=>({count:0,error:false}),widgetQuickAvailable:true},
  },{setTimeout:()=>1,clearTimeout(){},setInterval:(fn:()=>void)=>{timers.push(fn);return 1;},clearInterval(){}});
  const read=()=>elements(h.render()).filter(e=>e.type==='Text').map(e=>[e.props.children].flat(Infinity).join('')).join('\n');
  const first=read();h.flushEffects();
  assert.ok(first.includes('Anteprima widget · calcolo locale'));
  const confirmed='Ultimo aggiornamento confermato: '+new Date(stamp).toLocaleString('it-IT',{timeZone:'Europe/Rome'});
  assert.ok(first.includes(confirmed));assert.doesNotMatch(first,/Agg\./);
  timers[0]!();await new Promise(resolve=>setImmediate(resolve));
  assert.ok(read().includes(confirmed));
});
