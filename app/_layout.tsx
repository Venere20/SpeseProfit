import { Stack } from 'expo-router/js-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { RuntimeProvider, useRuntime } from '../src/ui/context';
import { LockScreen } from '../src/ui/LockScreen';
import { colors } from '../src/ui/theme';
import { ScreenPrivacy } from '../src/ui/ScreenPrivacy';
function Content() {
  const { locked, touchActivity } = useRuntime();
  return <View style={{ flex: 1 }} onTouchStart={touchActivity}>
    {locked ? <LockScreen /> : <Stack detachInactiveScreens={false} screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="movimento" options={{ title: 'Dettaglio movimento' }} />
      <Stack.Screen name="modifica-spesa" options={{ title: 'Modifica spesa' }} />
      <Stack.Screen name="mese" options={{ title: 'Bilancio mensile' }} />
      <Stack.Screen name="accumulato" options={{ title: 'Differenza accumulata' }} />
      <Stack.Screen name="promemoria" options={{ title: 'Promemoria serale' }} />
      <Stack.Screen name="giornata" options={{ title: 'Controllo giornaliero' }} />
      <Stack.Screen name="anno" options={{ title: 'Vista annuale' }} />
      <Stack.Screen name="confronto" options={{ title: 'Confronto tra mesi' }} />
      <Stack.Screen name="incasso" options={{ title: 'Incasso settimanale' }} />
      <Stack.Screen name="rapido" options={{ title: 'Inserimento rapido' }} />
      <Stack.Screen name="spesa" options={{ title: 'Nuova spesa' }} />
      <Stack.Screen name="categorie" options={{ title: 'Categorie' }} />
      <Stack.Screen name="sicurezza" options={{ title: 'Sicurezza' }} />
      <Stack.Screen name="widget" options={{ title: 'Widget' }} />
    </Stack>}
  </View>;
}
export default function RootLayout() {
  return <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
    <StatusBar style="light" /><ScreenPrivacy><RuntimeProvider><Content /></RuntimeProvider></ScreenPrivacy>
  </SafeAreaView></SafeAreaProvider></GestureHandlerRootView>;
}
