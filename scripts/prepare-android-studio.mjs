import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const android = path.join(root, 'android');
const open = process.argv.includes('--open');
const xml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const slash = value => value.replaceAll('\\', '/');

function upsert(file, key, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const rows = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(row => !row.startsWith(`${key}=`)) : [];
  fs.writeFileSync(file, `${rows.filter((row, i) => row || i < rows.length - 1).join('\n')}\n${key}=${value}\n`);
}

function main() {
  if (!fs.existsSync(path.join(root, 'node_modules/expo/package.json'))) throw new Error('Installa prima le dipendenze con npm ci nella cartella SpeseProfit.');
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
    (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
  if (!sdk || !fs.existsSync(path.join(sdk, 'platform-tools'))) throw new Error('Installa Android SDK da Android Studio e configura ANDROID_HOME.');
  const jdkCandidates = [process.env.JAVA_HOME, process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Java', 'jdk-17')].filter(Boolean);
  const jdk = jdkCandidates.find(candidate => {
    const result = spawnSync(path.join(candidate, 'bin', 'java.exe'), ['-version'], { encoding: 'utf8', windowsHide: true });
    return result.status === 0 && /version "17\./.test(result.stderr + result.stdout);
  });
  if (!jdk) throw new Error('Configura JAVA_HOME con un JDK 17. Il runtime di Android Studio resta separato.');
  const buildFile = path.join(android, 'build.gradle');
  if (!fs.existsSync(buildFile) || !fs.readFileSync(buildFile, 'utf8').includes("apply from: '../scripts/android-project.gradle'")) {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/expo.mjs'), 'prebuild', '--platform', 'android', '--no-install'], { cwd: root, stdio: 'inherit', windowsHide: true });
    if (result.status !== 0) throw new Error('Preparazione del progetto Android non riuscita.');
  }
  upsert(path.join(android, 'local.properties'), 'sdk.dir', slash(path.resolve(sdk)));
  upsert(path.join(android, '.gradle/config.properties'), 'java.home', slash(path.resolve(jdk)));
  const gradleHome = path.join(root, 'work/gradle-home');
  fs.mkdirSync(gradleHome, { recursive: true });
  const idea = path.join(android, '.idea/gradle.xml');
  if (!fs.existsSync(idea)) {
    fs.mkdirSync(path.dirname(idea), { recursive: true });
    fs.writeFileSync(idea, `<?xml version="1.0" encoding="UTF-8"?>\n<project version="4">\n  <component name="GradleSettings">\n    <option name="serviceDirectoryPath" value="${xml(slash(gradleHome))}" />\n    <option name="linkedExternalProjectsSettings">\n      <GradleProjectSettings>\n        <option name="distributionType" value="DEFAULT_WRAPPED" />\n        <option name="externalProjectPath" value="$PROJECT_DIR$" />\n        <option name="gradleJvm" value="#GRADLE_LOCAL_JAVA_HOME" />\n        <option name="modules"><set><option value="$PROJECT_DIR$" /><option value="$PROJECT_DIR$/app" /></set></option>\n      </GradleProjectSettings>\n    </option>\n  </component>\n</project>\n`);
  } else console.log('Impostazioni IDE esistenti conservate. Verifica JDK e Gradle user home nella guida se necessario.');
  const key = path.join(root, 'work/signing/speseprofit-local.p12');
  const credentials = path.join(root, 'work/signing/credentials.json');
  if (fs.existsSync(key) !== fs.existsSync(credentials)) throw new Error('Firma privata incompleta: verifica work/signing senza sovrascrivere la chiave.');
  if (!fs.existsSync(key)) {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-File', path.join(root, 'scripts/prepare-signing.ps1')], {
      cwd: root, env: { ...process.env, JAVA_HOME: jdk }, encoding: 'utf8', windowsHide: true,
    });
    // The signing helper returns credentials to its caller: never display stdout.
    if (result.status !== 0 || !fs.existsSync(key)) throw new Error('Firma privata assente. Esegui scripts/prepare-signing.ps1 da una console PowerShell consentita.');
  }
  console.log(`Progetto Android Studio pronto: ${android}`);
  console.log('Apri la cartella android, attendi Gradle Sync e scegli la variante app: release per la versione autonoma.');
  console.log('La variante debug e separata e richiede Metro. Guida: docs/ANDROID_STUDIO.md');
  if (open) {
    // Avoid the IDE's EDT cancellation path when replacing an open project
    // while Gradle sync is active. Do not close or kill the existing IDE.
    const processes = spawnSync('tasklist.exe', ['/FI', 'IMAGENAME eq studio64.exe', '/FO', 'CSV', '/NH'], {
      encoding: 'utf8', windowsHide: true,
    });
    const alreadyOpen = /^"studio64\.exe"/im.test(processes.stdout || '');
    if (processes.status !== 0 || processes.error || alreadyOpen) {
      console.log(alreadyOpen ? '\nAndroid Studio e gia aperto. Il progetto e pronto.' : '\nVerifica del processo IDE non disponibile. Apri il progetto manualmente.');
      console.log('Se android e gia caricato, usa quella finestra e attendi la fine di Gradle Sync.');
      console.log(`Altrimenti scegli File > Open > ${android} e poi NUOVA FINESTRA.`);
      console.log('Evita di sostituire la finestra attuale mentre Gradle sta sincronizzando.');
      process.exitCode = 2;
      return;
    }
    const installRoot = process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Android');
    const candidates = installRoot && fs.existsSync(installRoot) ? fs.readdirSync(installRoot).filter(name => name.startsWith('Android Studio'))
      .map(name => path.join(installRoot, name, 'bin/studio64.exe')).filter(file => fs.existsSync(file)) : [];
    if (!candidates.length) throw new Error(`Apri Android Studio manualmente e seleziona ${android}`);
    const executable = candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    const child = spawn(executable, [android], { detached: true, stdio: 'ignore', windowsHide: false });
    child.on('error', () => console.error('Apri Android Studio manualmente dalla cartella android.'));
    child.unref();
  }
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
