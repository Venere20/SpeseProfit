import { useEffect, useState } from 'react';
import { AppState, Linking, Text } from 'react-native';
import { reminderAvailable, reminderStatus, requestReminderPermission } from '../src/adapters/native/reminder';
import { Button, Card, Choice, Choices, Field, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { styles } from '../src/ui/theme';
export default function Reminder() {
  const { state, run, busy } = useRuntime();
  const [hour, setHour] = useState(String(state?.dailyReminder?.hour ?? 21));
  const [minute, setMinute] = useState(String(state?.dailyReminder?.minute ?? 30));
  const [enabled, setEnabled] = useState(state?.dailyReminder?.enabled ?? false);
  const [allowed, setAllowed] = useState(false); const [scheduled, setScheduled] = useState(false);
  const [message, setMessage] = useState(''); const [requesting, setRequesting] = useState(false);
  const refresh = async () => { try { const s = await reminderStatus(); setAllowed(s.allowed); setScheduled(s.scheduled); if (s.error) setMessage('Programmazione non riuscita. Salva di nuovo le impostazioni.'); return s; } catch (e) { setMessage((e as Error).message); return null; } };
  useEffect(() => { const pending = setTimeout(() => { void refresh(); }, 0); const sub = AppState.addEventListener('change', status => { if (status === 'active') void refresh(); }); return () => { clearTimeout(pending); sub.remove(); }; }, []);
  return <Page title="Promemoria serale" >
    <Card><Text style={styles.subheading}>Notifiche Android</Text><Text style={styles.muted}>{allowed ? 'Notifiche consentite.' : 'Notifiche non consentite.'}</Text>
      {!allowed && <Button title="Consenti notifiche Android" busy={requesting} disabled={!reminderAvailable} onPress={() => { setRequesting(true); setMessage(''); void requestReminderPermission().then(refresh).catch(e => setMessage(e.message)).finally(() => setRequesting(false)); }} />}
      <Button title="Apri impostazioni notifiche dell’app" secondary onPress={() => { void Linking.openSettings().catch(() => setMessage('Apri le impostazioni Android di SpeseProfit.')); }} />
    </Card>
    <Card><Text style={styles.subheading}>Orario · Europe/Rome</Text>
      <Choices><Choice label="Disattivato" selected={!enabled} disabled={busy} onPress={() => setEnabled(false)} /><Choice label="Attivato" selected={enabled} disabled={busy || !allowed} onPress={() => setEnabled(true)} /></Choices>
      <Field label="Ora (0–23)" value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} editable={!busy} />
      <Field label="Minuti (0–59)" value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} editable={!busy} />
      <Button title="Salva promemoria" busy={busy} disabled={!reminderAvailable} onPress={() => {
        setMessage(''); if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) { setMessage('Inserisci ora e minuti validi.'); return; }
        if (enabled && !allowed) { setMessage('Consenti prima le notifiche Android, oppure disattiva il promemoria.'); return; }
        void run(s => s.setDailyReminder({ enabled, hour: Number(hour), minute: Number(minute) })).then(async () => { const status = await refresh(); if (status && !status.error) setMessage('Preferenze salvate.'); }).catch(e => setMessage(e.message));
      }} />
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
      <Text style={styles.muted}>{scheduled ? 'Un promemoria è programmato.' : 'Nessun promemoria attualmente programmato.'}</Text>
      
    </Card>
  </Page>;
}
