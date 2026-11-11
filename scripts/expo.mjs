import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { localAddress } from './local-network.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = path.join(root, 'work/tmp');
mkdirSync(temp, { recursive: true });
const cli = path.join(root, 'node_modules/expo/bin/cli');
const args = process.argv.slice(2);
const env = { ...process.env, TMP: temp, TEMP: temp, EXPO_NO_CACHE: '1', __UNSAFE_EXPO_HOME_DIRECTORY: path.join(root, 'work/expo-home') };
if (args[0] === 'start' && !args.includes('--localhost') && !args.includes('--tunnel') && !env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  const address = localAddress();
  if (address) env.REACT_NATIVE_PACKAGER_HOSTNAME = address;
}
const child = spawn(process.execPath, [cli, ...args], {
  cwd: root, stdio: 'inherit', env,
});
child.on('exit', code => process.exit(code ?? 1));
