import { bankAvailable, syncBankGmail, configureBankInbox, importBankPending } from './bank';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { emptyLedger } from '../../domain/model';
import { assertSessionTimeout } from '../../domain/session';
import { LedgerService } from '../../application/ledgerService';

interface NativeVault {
  vaultStatus(): Promise<'missing' | 'ready' | 'damaged'>;
  createVault(password: string, initial: string): Promise<number>;
  unlockVault(password: string): Promise<number>;
  lockVault(): Promise<void>;
  touchVault(ticket: number): Promise<void>;
  readVault(ticket: number): Promise<string>;
  writeVault(ticket: number, json: string): Promise<void>;
  changeVaultPassword(ticket: number, current: string, next: string): Promise<void>;
  readWidgetPending?(ticket: number): Promise<string>;
  ackWidgetPending?(ticket: number, ids: string[]): Promise<void>;
  publishWidgetSlots?(ticket: number): Promise<void>;
  reportWidgetQueueError?(ticket: number): Promise<void>;
  discardWidgetPending?(ticket: number): Promise<void>;
  getSessionTimeout?(): Promise<number>;
  setSessionTimeout?(ticket: number, milliseconds: number): Promise<void>;
  resumeVault?(): Promise<number | null>;
}
const native = requireOptionalNativeModule<NativeVault>('SpeseProfitNative');
const methods: (keyof NativeVault)[] = ['vaultStatus', 'createVault', 'unlockVault', 'lockVault', 'touchVault', 'readVault', 'writeVault', 'changeVaultPassword'];
export const protectedVaultAvailable = Platform.OS === 'android' && !!native && methods.every(method => typeof native[method] === 'function');
// Older dedicated builds must still recognize their protected archive.
export const sessionRetentionAvailable = protectedVaultAvailable && !!native &&
  typeof native.getSessionTimeout === 'function' && typeof native.setSessionTimeout === 'function' && typeof native.resumeVault === 'function';
function api() {
  if (!protectedVaultAvailable || !native) throw new Error('L’archivio cifrato richiede la build Android dedicata. Expo Go non lo supporta.');
  return native;
}

function serviceForTicket(bridge: NativeVault, ticket: number) {
  if (!Number.isSafeInteger(ticket) || ticket < 0) throw new Error('Sessione non valida.');
  return new LedgerService({
    async load() {
      return JSON.parse(await bridge.readVault(ticket)) as unknown;
    },
    async save(state) {
      await bridge.writeVault(ticket, JSON.stringify(state));
      await configureBankInbox(ticket,state.bankAutomation);
      if (bridge.publishWidgetSlots) await bridge.publishWidgetSlots(ticket).catch(() => undefined);
    },
  });
}
async function importPending(bridge: NativeVault, ticket: number, service: LedgerService) {
  if (!bridge.readWidgetPending || !bridge.ackWidgetPending) return;
  try {
    const items = JSON.parse(await bridge.readWidgetPending(ticket)) as { id: string }[];
    if (!Array.isArray(items)) throw new Error('Coda non valida.');
    if (items.length) {
      await service.importWidgetExpenses(items);
      await bridge.ackWidgetPending(ticket, items.map(item => item.id));
    }
    await bridge.publishWidgetSlots?.(ticket);
  } catch {
    // Keep the archive usable and all unacknowledged requests durable.
    await bridge.reportWidgetQueueError?.(ticket).catch(() => undefined);
  }
}
export async function vaultStatus() { return protectedVaultAvailable ? api().vaultStatus() : 'unavailable' as const; }
export async function openProtectedVault(password: string, create: boolean) {
  const bridge = api();
  const ticket = create ? await bridge.createVault(password, JSON.stringify(emptyLedger())) : await bridge.unlockVault(password);
  const service = serviceForTicket(bridge, ticket);
  try { await service.init(); await importPending(bridge, ticket, service);
    await configureBankInbox(ticket,service.read().bankAutomation);
    await importBankPending(ticket,service).catch(()=>undefined);
    if(bankAvailable&&service.read().bankAutomation)void syncBankGmail().catch(()=>undefined); return { service, ticket }; }
  catch (error) { service.dispose(); await bridge.lockVault(); throw error; }
}
export async function resumeProtectedVault() {
  const bridge = api();
  if (!sessionRetentionAvailable || !bridge.resumeVault) return null;
  const ticket = await bridge.resumeVault();
  if (ticket === null) return null;
  const service = serviceForTicket(bridge, ticket);
  try { await service.init(); await importPending(bridge, ticket, service);
    await configureBankInbox(ticket,service.read().bankAutomation);
    await importBankPending(ticket,service).catch(()=>undefined);
    if(bankAvailable&&service.read().bankAutomation)void syncBankGmail().catch(()=>undefined); return { service, ticket }; }
  catch (error) { service.dispose(); throw error; }
}
export async function getProtectedSessionTimeout() {
  if (!sessionRetentionAvailable) return 0;
  const value = await api().getSessionTimeout!();
  assertSessionTimeout(value);
  return value;
}
export async function setProtectedSessionTimeout(ticket: number, milliseconds: number) {
  assertSessionTimeout(milliseconds);
  if (!sessionRetentionAvailable) throw new Error('Aggiorna l’app per cambiare questa impostazione.');
  await api().setSessionTimeout!(ticket, milliseconds);
}
export async function lockProtectedVault() { if (protectedVaultAvailable) await api().lockVault(); }
export async function touchProtectedVault(ticket: number) { await api().touchVault(ticket); }
export async function changeProtectedPassword(ticket: number, current: string, next: string) { await api().changeVaultPassword(ticket, current, next); }


export async function discardProtectedWidgetPending(ticket: number) {
  const bridge = api();
  if (!bridge.discardWidgetPending) throw new Error('Aggiorna la build Android.');
  await bridge.discardWidgetPending(ticket);
}
