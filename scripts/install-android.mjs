import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
  (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
const apk = path.join(root, 'work', 'distribution', 'SpeseProfit-0.1.0-arm64.apk');
const digestFile = path.join(root, 'work', 'distribution', 'SHA256SUMS.txt');
const checkOnly = process.argv.includes('--check');

function fail(message) { throw new Error(message); }
function main() {
  if (process.argv.includes('--help')) {
    console.log('Installa la build Android firmata sul solo telefono collegato.');
    console.log('Usa --check per verificare APK e collegamento senza installare.');
    return;
  }
  if (!sdk || !existsSync(path.join(sdk, 'platform-tools', 'adb.exe'))) {
    fail('Strumenti Android non trovati. Configura ANDROID_HOME con la cartella Android SDK.');
  }
  if (!existsSync(apk) || !existsSync(digestFile)) {
    fail('APK firmato non trovato. Prepara prima la build standalone.');
  }
  const expected = readFileSync(digestFile, 'utf8').trim().match(/^([a-f0-9]{64})\s+SpeseProfit-0\.1\.0-arm64\.apk$/i)?.[1];
  const actual = createHash('sha256').update(readFileSync(apk)).digest('hex');
  if (!expected || actual !== expected.toLowerCase()) fail('Controllo del file fallito: APK diverso da quello preparato. Installazione interrotta.');
  console.log('APK pronto: controllo del file superato.');
  const adb = path.join(sdk, 'platform-tools', 'adb.exe');
  function run(args) {
    const result = spawnSync(adb, args, { encoding: 'utf8', windowsHide: true, timeout: 120_000 });
    if (result.error) fail(`Comunicazione Android non riuscita: ${result.error.message}`);
    if (result.status !== 0) fail(result.stderr?.trim() || result.stdout?.trim() || 'Operazione Android non riuscita.');
    return result.stdout;
  }
  const phones = run(['devices']).split(/\r?\n/).map(line => line.trim().match(/^(\S+)\s+(device|unauthorized|offline)(?:\s|$)/))
    .filter(row => row && !row[1].startsWith('emulator-'));
  if (!phones.length) fail('Telefono non rilevato. Sbloccalo, collega un cavo USB dati, attiva Debug USB e autorizza il computer.');
  if (phones.length > 1) fail('Sono presenti piu telefoni. Lascia collegato soltanto quello su cui vuoi installare SpeseProfit.');
  const [, serial, state] = phones[0];
  if (state === 'unauthorized') fail('Sul telefono conferma "Consentire debug USB?", poi riprova.');
  if (state !== 'device') fail('Telefono non disponibile. Scollega e ricollega il cavo, sblocca lo schermo e riprova.');
  const args = ['-s', serial];
  const abis = run([...args, 'shell', 'getprop', 'ro.product.cpu.abilist']).trim().split(',');
  const api = Number(run([...args, 'shell', 'getprop', 'ro.build.version.sdk']).trim());
  if (!abis.includes('arm64-v8a') || !Number.isFinite(api) || api < 24) fail('Questa build richiede un telefono Android ARM64 con Android 7 o successivo.');
  console.log('Telefono collegato, autorizzato e compatibile.');
  if (checkOnly) { console.log('Verifica terminata: nessuna installazione eseguita.'); return; }
  console.log('Installazione in corso. Conferma sul telefono se Android lo richiede...');
  const result = run([...args, 'install', '-r', apk]);
  if (!/^Success\s*$/m.test(result)) fail('Android non ha confermato il completamento.');
  console.log('SpeseProfit installata. Apri "SpeseProfit" sul telefono.');
  console.log('Apri SpeseProfit e sblocca il tuo archivio. Al primo avvio crea una password. Attiva gli avvisi facoltativi da Impostazioni > Automazioni Fineco.');
}

try { main(); }
catch (error) {
  console.error(`\n${error.message}`);
  console.error('Se Android rifiuta un aggiornamento, non disinstallare per forzarlo: potresti perdere lo storico protetto.');
  process.exitCode = 1;
}

