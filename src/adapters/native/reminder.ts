import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
interface ReminderBridge {
  reminderStatus(): Promise<{ allowed: boolean; scheduled: boolean; error: boolean }>;
  requestReminderPermission(): Promise<{ granted: boolean }>;
}
const native = requireOptionalNativeModule<ReminderBridge>('SpeseProfitNative');
export const reminderAvailable = Platform.OS === 'android' && typeof native?.reminderStatus === 'function';
export async function reminderStatus() {
  if (!reminderAvailable || !native) throw new Error('Aggiorna la build Android per usare il promemoria.');
  return native.reminderStatus();
}
export async function requestReminderPermission() {
  if (!native || !reminderAvailable) throw new Error('Serve la build Android aggiornata.');
  return native.requestReminderPermission();
}
