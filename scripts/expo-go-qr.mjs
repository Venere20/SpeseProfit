import { mkdir, writeFile } from 'node:fs/promises';
import { toQR } from 'toqr';
import { PNG } from 'pngjs';
import { localAddress } from './local-network.mjs';

async function main() {
const address = localAddress(process.argv[2]);
if (!address) throw new Error('Specifica un indirizzo della rete locale del computer.');
// Query locally using the Host header that the phone will send over Wi-Fi.
const response = await fetch('http://127.0.0.1:8081', {
  headers: { accept: 'application/json', 'expo-platform': 'android', host: `${address}:8081` },
  signal: AbortSignal.timeout(45_000),
});
if (!response.ok) throw new Error('Avvia prima npm start -- --go --lan --port 8081.');
const manifest = await response.json();
const host = manifest.extra?.expoClient?.hostUri;
if (host !== `${address}:8081`) throw new Error('Indirizzo Expo non raggiungibile dal telefono.');
const url = `exp://${host}`;
const matrix = toQR(url);
const size = Math.sqrt(matrix.length);
if (!Number.isInteger(size)) throw new Error('Matrice QR non valida.');
const border = 4;
const scale = 10;
const image = new PNG({ width: (size + border * 2) * scale, height: (size + border * 2) * scale });
for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
  const mx = Math.floor(x / scale) - border;
  const my = Math.floor(y / scale) - border;
  const dark = mx >= 0 && my >= 0 && mx < size && my < size && !!matrix[my * size + mx];
  const offset = (y * image.width + x) * 4;
  image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = dark ? 0 : 255;
  image.data[offset + 3] = 255;
}
await mkdir('work', { recursive: true });
await writeFile('work/expo-go-qr.png', PNG.sync.write(image));
await writeFile('work/expo-go-connection.json', JSON.stringify({ url, sdkVersion: manifest.extra?.expoClient?.sdkVersion, generatedAt: new Date().toISOString() }, null, 2));
process.stdout.write(`Expo Go: ${url}\nQR: work/expo-go-qr.png\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Errore QR.'}\nAvvia npm start -- --go --lan --port 8081, attendi che sia pronto e riprova.\n`);
  process.exitCode = 1;
});
