import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { displayDate, displayMonth } from '../src/domain/calendar';
import { money, romeDate } from '../src/domain/ledger';
import { MIN_MONTH, MAX_MONTH, monthStart, shiftMonth } from '../src/domain/monthly';
import { compareMonths, ComparisonMode } from '../src/domain/reports';
import { Button, Card, Choice, Choices, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { colors, styles } from '../src/ui/theme';

const signedMoney = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`;
const percentage = (value: number | null) => value === null ? 'base a zero' : new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(value);
function MonthPicker({ title, value, onChange, maximum }: { title: string; value: string; onChange: (month: string) => void; maximum: string }) {
  return <Card><Text style={styles.label}>{title}</Text><View style={styles.row}>
    <Button title="‹" secondary disabled={value <= MIN_MONTH} onPress={() => onChange(shiftMonth(value, -1))} />
    <Text style={[styles.text, { flex: 1, textAlign: 'center', textTransform: 'capitalize', fontWeight: '700' }]}>{displayMonth(value + '-01')}</Text>
    <Button title="›" secondary disabled={value >= maximum || value >= MAX_MONTH} onPress={() => onChange(shiftMonth(value, 1))} />
  </View></Card>;
}
export default function ComparisonRoute() {
  const { month } = useLocalSearchParams<{ month?: string | string[] }>();
  const current = romeDate().slice(0, 7);
  let initialMonth = current;
  try { if (typeof month === 'string' && month <= current) { monthStart(month); shiftMonth(month, -1); initialMonth = month; } } catch { /* Ignore invalid navigation parameters. */ }
  return <MonthComparison key={initialMonth} initialMonth={initialMonth} />;
}
function MonthComparison({ initialMonth }: { initialMonth: string }) {
  const { state } = useRuntime();
  const [current, setCurrent] = useState(initialMonth);
  const [previous, setPrevious] = useState(() => { try { return shiftMonth(initialMonth, -1); } catch { return initialMonth; } });
  const [mode, setMode] = useState<ComparisonMode>('equivalent');
  if (!state) return null;
  const maximum = romeDate().slice(0, 7);
  let result: ReturnType<typeof compareMonths>;
  try { result = compareMonths(state, current, previous, mode); }
  catch { return <Page title="Confronto tra mesi"><Card><Text style={styles.error}>Periodo non disponibile.</Text><Button title="Torna al mese corrente" onPress={() => { const month = romeDate().slice(0, 7); setCurrent(month); setPrevious(shiftMonth(month, -1)); }}/></Card></Page>; }
  const missing = result.current.missingWeeks.length + result.previous.missingWeeks.length;
  return <Page title="Confronto tra mesi" >
    <MonthPicker title="Mese analizzato" value={current} onChange={setCurrent} maximum={maximum} />
    <MonthPicker title="Mese di riferimento" value={previous} onChange={setPrevious} maximum={maximum} />
    <Choices><Choice label="Periodo equivalente" selected={mode === 'equivalent'} onPress={() => setMode('equivalent')} />
      <Choice label="Mesi interi" selected={mode === 'full'} onPress={() => setMode('full')} /></Choices>
    <Card><Text style={styles.subheading}>Periodi confrontati</Text>
      <Text style={styles.text}>Analizzato: {displayDate(current + '-01')} — {displayDate(result.current.throughDate)}</Text>
      <Text style={styles.text}>Riferimento: {displayDate(previous + '-01')} — {displayDate(result.previous.throughDate)}</Text>
      <Text style={styles.muted}>{result.aligned ? 'Periodi di pari durata' : 'Mesi interi'}</Text>
      {result.ongoing && !result.aligned && <Text style={styles.error}>Uno dei mesi è ancora in corso: il suo totale può essere incompleto.</Text>}
      {!!missing && <Text style={styles.error}>Confronto parziale: mancano incassi settimanali nei periodi selezionati.</Text>}
    </Card>
    <Card><Text style={styles.subheading}>Entrate</Text>
      <View style={styles.row}><Text style={styles.text}>Analizzato</Text><Text style={styles.text}>{money(result.current.income)}</Text></View>
      <View style={styles.row}><Text style={styles.text}>Riferimento</Text><Text style={styles.text}>{money(result.previous.income)}</Text></View>
      <Text style={[styles.subheading, { color: result.income.cents < 0 ? colors.danger : colors.accent }]}>{signedMoney(result.income.cents)} · {percentage(result.income.ratio)}</Text>
    </Card>
    {(result.current.refunds>0||result.previous.refunds>0)&&<Card><Text style={styles.subheading}>Rimborsi ricevuti</Text><Text style={styles.text}>Analizzato: {money(result.current.refunds)}</Text><Text style={styles.text}>Riferimento: {money(result.previous.refunds)}</Text><Text style={styles.text}>Differenza: {signedMoney(result.refunds.cents)}</Text></Card>}
    <Card><Text style={styles.subheading}>Uscite</Text>
      <View style={styles.row}><Text style={styles.text}>Analizzato</Text><Text style={styles.text}>{money(result.current.expenses)}</Text></View>
      <View style={styles.row}><Text style={styles.text}>Riferimento</Text><Text style={styles.text}>{money(result.previous.expenses)}</Text></View>
      <Text style={[styles.subheading, { color: result.expenses.cents > 0 ? colors.danger : colors.accent }]}>{signedMoney(result.expenses.cents)} · {percentage(result.expenses.ratio)}</Text>
      <Text style={styles.muted}>{result.expenses.cents > 0 ? 'Hai speso di più.' : result.expenses.cents < 0 ? 'Hai speso di meno.' : 'Spese invariate.'}</Text>
    </Card>
    <Card><Text style={styles.subheading}>Saldo</Text>
      <View style={styles.row}><Text style={styles.text}>Analizzato</Text><Text style={styles.text}>{signedMoney(result.current.balance)}</Text></View>
      <View style={styles.row}><Text style={styles.text}>Riferimento</Text><Text style={styles.text}>{signedMoney(result.previous.balance)}</Text></View>
      <Text style={[styles.subheading, { color: result.balanceChange < 0 ? colors.danger : colors.accent }]}>{signedMoney(result.balanceChange)}</Text>
      <Text style={styles.muted}>{result.balanceChange > 0 ? 'Il saldo è migliorato.' : result.balanceChange < 0 ? 'Il saldo è peggiorato.' : 'Saldo invariato.'}</Text>
    </Card>
    <Button title="Apri calendario del mese analizzato" secondary onPress={() => router.push({ pathname: '/mese', params: { month: current } })} />
    
    <Card><Text style={styles.subheading}>Cosa è cambiato per categoria</Text>
      
      {result.categories.length === 0 ? <Text style={styles.text}>Nessuna spesa inclusa nei periodi selezionati.</Text> : result.categories.map(category => <View key={category.categoryId} style={{ gap: 7, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Text style={[styles.text, { fontWeight: '700' }]}>{state.categories.find(c => c.id === category.categoryId)?.name ?? 'Categoria'}</Text>
        <Text style={styles.muted}>Analizzato {money(category.current)} · Riferimento {money(category.previous)}</Text>
        <Text style={[styles.text, { fontWeight: '700', color: category.cents > 0 ? colors.danger : colors.accent }]}>{signedMoney(category.cents)} · {percentage(category.ratio)}</Text>
      </View>)}
    </Card>
  </Page>;
}
