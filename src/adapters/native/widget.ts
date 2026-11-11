import { requireOptionalNativeModule } from 'expo-modules-core';
import { WidgetSnapshot } from '../../domain/model';
interface NativeWidget {
  publishWidget(week: string, state: string, calculatedAt: string): Promise<void>;
  clearWidget(): Promise<void>;
  widgetQueueStatus?(): Promise<{ count: number; error: boolean; counts?: number[] }>;
}
const native = requireOptionalNativeModule<NativeWidget>('SpeseProfitNative');
export const nativeWidgetAvailable = !!native;
export async function publishNativeWidget(snapshot: WidgetSnapshot) {
  if (!native) throw new Error('Widget Android non disponibile.');
  await native.publishWidget(snapshot.weekStart, snapshot.balanceState, snapshot.calculatedAt);
}
export async function clearNativeWidget() { if (native) await native.clearWidget(); }

export const widgetQuickAvailable = typeof native?.widgetQueueStatus === 'function';
export async function widgetQueueStatus() {
  if (!native?.widgetQueueStatus) return { count: 0, error: false };
  return native.widgetQueueStatus();
}
