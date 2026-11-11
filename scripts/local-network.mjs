import { networkInterfaces } from 'node:os';

export function localAddress(explicit) {
  const interfaces = Object.entries(networkInterfaces()).flatMap(([name, rows]) =>
    (rows ?? []).filter(row => row.family === 'IPv4' && !row.internal).map(row => ({ name, address: row.address })));
  const wifi = interfaces.filter(row => /wi-?fi|wlan|wireless/i.test(row.name));
  const address = explicit ?? (wifi.length === 1 ? wifi[0].address : interfaces.length === 1 ? interfaces[0].address : null);
  return address && interfaces.some(row => row.address === address) ? address : null;
}
