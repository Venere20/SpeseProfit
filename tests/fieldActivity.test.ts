import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import ts from 'typescript';
import { SessionWindow } from '../src/domain/session';

// Exercise the actual Field event handlers without starting a native UI.
function inputFor(touchActivity:()=>void, callbacks:Record<string,unknown>={}) {
 const source=readFileSync(new URL('../src/ui/components.tsx',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const exports:Record<string,unknown>={};
 runInNewContext(compiled,{exports,require:(name:string)=>{
  if(name==='react')return {...React,useState:(value:unknown)=>[value,()=>undefined]};
  if(name==='react-native')return {View:'View',Text:'Text',TextInput:'TextInput'};
  if(name==='./context')return {useRuntime:()=>({touchActivity})};
  if(name==='./theme')return {colors:{},styles:{}};
  if(name==='./Icon'||name==='expo-router')return {};
  throw new Error('Unexpected dependency: '+name);
 }});
 const field=exports.Field as (props:Record<string,unknown>)=>{props:{children:{type:string;props:{onChangeText:(value:string)=>void;onFocus:(event:unknown)=>void}}[]}};
 return field({label:'Descrizione',...callbacks}).props.children.find(child=>child?.type==='TextInput')!.props;
}

test('Field: digitare rinnova la sessione anche senza tocchi nella schermata, poi il blocco scatta per inattività',()=>{
 let now=0;const session=new SessionWindow(()=>now);session.setDuration(60_000);session.start();
 const values:string[]=[];let touches=0;
 const input=inputFor(()=>{touches++;session.touch();},{onChangeText:(value:string)=>values.push(value)});
 assert.equal(touches,0); // Rendering alone must never keep the session alive.
 now=59_000;input.onChangeText('C');now=118_000;input.onChangeText('Caffè');now=177_000;input.onChangeText('Caffè al bar');
 assert.equal(session.expired(),false);assert.deepEqual(values,['C','Caffè','Caffè al bar']);assert.equal(touches,3);
 now=236_999;assert.equal(session.expired(),false);now=237_000;assert.equal(session.expired(),true);
 input.onChangeText('Tardi');assert.equal(session.expired(),true);
});

test('Field: Subito conserva il blocco al ritorno; focus e modifica mantengono le callback esistenti',()=>{
 let now=0;const session=new SessionWindow(()=>now);session.start();let focused:unknown;let changed='';
 const input=inputFor(()=>session.touch(),{onFocus:(event:unknown)=>{focused=event;},onChangeText:(value:string)=>{changed=value;}});
 const event={nativeEvent:{target:1}};now=119_000;input.onFocus(event);assert.equal(focused,event);
 now=238_000;input.onChangeText('Nota');assert.equal(changed,'Nota');assert.equal(session.expired(),false);assert.equal(session.mayResume(),false);
 now=358_000;assert.equal(session.expired(),true);
});
