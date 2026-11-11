import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { accumulatedReport } from '../src/domain/progress';
import { money, weekOf } from '../src/domain/ledger';
import { displayDate } from '../src/domain/calendar';
import { DateField } from '../src/ui/DateField';
import { Button, Card, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { styles } from '../src/ui/theme';
export default function Accumulated() {
  const { state, run, busy, setWeek } = useRuntime();
  const initial = state ? accumulatedReport(state).start : '';
  const [date, setDate] = useState(initial); const [error, setError] = useState(''); const [limit, setLimit] = useState(12);
  if (!state) return null;
  const report = accumulatedReport(state);
  return <Page title="Differenza accumulata" >
    <Card><Text style={styles.subheading}>{money(report.balance)}</Text>
      <Text style={styles.text}>Entrate: {money(report.income)} · Uscite: {money(report.expenses)}{report.refunds?` · Rimborsi: ${money(report.refunds)}`:''}</Text>
      <Text style={styles.muted}>Dal {displayDate(report.start)} a oggi, {displayDate(report.through)}. Include la settimana in corso.</Text>
      {!report.hasData && <Text style={styles.muted}>Non ci sono ancora registrazioni in questo periodo.</Text>}
      {!!report.missingWeeks.length && <Text style={styles.error}>Dati incompleti · {report.missingWeeks.length} settimane con incasso da compilare. Le spese sono comunque sottratte: il risultato è provvisorio.</Text>}
      
    </Card>
    <Card><Text style={styles.subheading}>Periodo di calcolo</Text>
      <DateField label="Scegli un giorno della settimana iniziale" value={date} onChange={setDate} disabled={busy} />
      
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button title="Applica settimana iniziale" busy={busy} onPress={() => { setError(''); void run(s => s.setAccumulationStart(weekOf(date))).then(() => setLimit(12)).catch(e => setError(e.message)); }} />
      <Button title="Calcola dall’inizio delle registrazioni" secondary disabled={busy} onPress={() => { setError(''); void run(s => s.setAccumulationStart()).then(() => { setDate(accumulatedReport({ ...state, accumulationStart: undefined }).start); setLimit(12); }).catch(e => setError(e.message)); }} />
    </Card>
    <Text style={styles.subheading}>Andamento per settimana</Text>
    {[...report.rows].reverse().slice(0, limit).map(row => <Card key={row.weekStart}>
      <View style={styles.row}><Text style={styles.label}>Dal {row.weekStart}{row.ongoing ? ' · in corso' : ''}</Text><Text style={styles.text}>{money(row.balance)}</Text></View>
      <Text style={styles.muted}>Entrate {money(row.income)} · Spese {money(row.expenses)}{row.refunds?` · Rimborsi ${money(row.refunds)}`:''}</Text>
      <Text style={styles.text}>Differenza accumulata: {money(row.accumulated)}</Text>
      <Text style={styles.muted}>{!row.hasCashIncome ? 'Incasso da compilare' : row.cashIncome === 0 ? 'Nessun incasso · zero confermato' : `Incasso settimanale ${money(row.cashIncome)}`}</Text>
      <Button title="Apri settimana" secondary onPress={() => { setWeek(row.weekStart); router.push({ pathname: '/(tabs)/analisi', params: { day: row.weekStart } }); }} />
    </Card>)}
    {report.rows.length > limit && <Button title="Mostra altre 12 settimane" secondary onPress={() => setLimit(v => v + 12)} />}
  </Page>;
}
