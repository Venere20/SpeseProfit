import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { money, romeDate, weekOf } from '../src/domain/ledger';
import { displayDate } from '../src/domain/calendar';
import { Button, Card, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { styles } from '../src/ui/theme';
export default function Day() {
  const { state, run, busy, setWeek } = useRuntime();
  const [today, setToday] = useState(romeDate()); const [error, setError] = useState('');
  useEffect(() => { const timer = setInterval(() => setToday(romeDate()), 1000); return () => clearInterval(timer); }, []);
  if (!state) return null;
  const rows = state.transactions.filter(t => t.date === today).sort((a,b) => a.id.localeCompare(b.id));
  const completed = state.completedDays?.includes(today) ?? false;
  const expenses = rows.filter(t => t.cents < 0 && t.classification === 'included').reduce((sum,t) => sum - t.cents,0);
  return <Page title="Controllo della giornata" subtitle={displayDate(today)}>
    <Card><Text style={styles.subheading}>{completed ? 'Giornata completata' : 'Hai registrato tutte le spese di oggi?'}</Text>
      <Text style={styles.text}>{rows.length} movimenti · Spese incluse: {money(expenses)}</Text>
      
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button title={completed ? 'Riapri controllo della giornata' : 'Giornata completata'} busy={busy} onPress={() => { setError(''); void run(s => s.completeToday(!completed)).catch(e => setError(e.message)); }} />
      <Button title="Aggiungi spesa di oggi" secondary disabled={busy} onPress={() => { setWeek(weekOf(today)); router.push('/spesa'); }} />
      <Button title="Configura promemoria serale" secondary onPress={() => router.push('/promemoria')} />
    </Card>
    {rows.map(t => <Card key={t.id}><View style={styles.row}><Text style={[styles.text, { flex: 1 }]}>{t.description}</Text><Text style={styles.text}>{money(t.cents)}</Text></View><Text style={styles.muted}>{state.categories.find(c => c.id === t.categoryId)?.name} · {t.origin==='account'?'Conto / bonifico':t.origin==='card'?'Carta':'Contanti'}{t.classification !== 'included' ? ' · non incide sul saldo' : ''}</Text></Card>)}
    <Button title="Cerca o modifica nei movimenti" secondary onPress={() => router.push('/movimenti')} />
  </Page>;
}
