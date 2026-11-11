import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { Button } from './components';
import { colors, styles } from './theme';

let protectionSequence = 0;

function AndroidPrivacy({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'checking' | 'ready' | 'failed'>('checking');
  useEffect(() => {
    let live = true;
    // A distinct key per effect also handles development remounts safely.
    const key = `speseprofit-screen-${++protectionSequence}`;
    const protection = preventScreenCaptureAsync(key).then(() => {
      if (live) setStatus('ready');
    }).catch(() => { if (live) setStatus('failed'); });
    return () => {
      live = false;
      // Restore the Expo Go host only after our pending request has settled.
      void protection.then(() => allowScreenCaptureAsync(key)).catch(() => undefined);
    };
  }, [attempt]);
  if (status === 'ready') return <>{children}</>;
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20, backgroundColor: colors.bg }}>
    {status === 'checking' ? <><ActivityIndicator color={colors.accent} /><Text style={styles.text}>Protezione delle schermate in attivazione…</Text></> : <>
      <Text style={styles.subheading}>Protezione delle schermate non disponibile</Text>
      <Text style={styles.text}>Impossibile aprire l’app con la protezione richiesta. Riprova o aggiorna l’app.</Text>
      <Button title="Riprova" onPress={() => { setStatus('checking'); setAttempt(n => n + 1); }} />
    </>}
  </View>;
}

export function ScreenPrivacy({ children }: { children: ReactNode }) {
  return Platform.OS === 'android' ? <AndroidPrivacy>{children}</AndroidPrivacy> : <>{children}</>;
}
