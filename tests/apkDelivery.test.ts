import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('R-01: il vecchio ingresso Wi-Fi non contiene più un server APK HTTP',()=>{
  const source=readFileSync(new URL('../scripts/serve-apk.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/node:http|createServer|createReadStream|toQR/);
});
test('R-01: procedura documentata mantiene USB e non propone installazione da browser',()=>{
  const source=readFileSync(new URL('../docs/INSTALLAZIONE_ANDROID.md',import.meta.url),'utf8');
  assert.doesNotMatch(source,/Apri con la fotocamera il QR di installazione/);
  assert.match(source,/USB/);
});
test('R-01: vecchio comando termina senza pubblicare pacchetti anche con argomenti',()=>{
  // Only execute the entry point after its network-serving capability is absent.
  const file=new URL('../scripts/serve-apk.mjs',import.meta.url);
  const source=readFileSync(file,'utf8');
  if (/node:http|createServer/.test(source)) return;
  for(const args of [[],['127.0.0.1'],['--help']]){
    const result=spawnSync(process.execPath,[fileURLToPath(file),...args],{encoding:'utf8',windowsHide:true,timeout:5000});
    assert.equal(result.status,1);
    assert.match(result.stderr,/disattivata/);
    assert.doesNotMatch(result.stdout,/http:\/\//);
  }
});

test('R-01: aiuto della procedura USB rimane utilizzabile senza contattare telefoni',()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/install-android.mjs',import.meta.url)),'--help'],{encoding:'utf8',windowsHide:true,timeout:5000});
  assert.equal(result.status,0); assert.match(result.stdout,/build Android firmata/);
});
