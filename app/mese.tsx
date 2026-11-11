import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { displayDate, displayMonth } from '../src/domain/calendar';
import { money, romeDate } from '../src/domain/ledger';
import { MIN_MONTH, MAX_MONTH, monthStart, monthlyCalendar, monthlySummary, shiftMonth, WeeklyClosure } from '../src/domain/monthly';
import { Button, Card, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { colors, styles } from '../src/ui/theme';

const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const closureStyles: Record<WeeklyClosure, { symbol: string; label: string; color: string }> = {
  positive: { symbol: '+', label: 'Chiusa in positivo', color: colors.positive },
  negative: { symbol: '−', label: 'Chiusa in negativo', color: colors.danger },
  even: { symbol: '=', label: 'Chiusa in pareggio', color: colors.accent },
  incomplete: { symbol: '?', label: 'Incasso mancante', color: colors.warning },
  ongoing: { symbol: '…', label: 'Settimana in corso', color: colors.muted },
  future: { symbol: '·', label: 'Settimana futura', color: colors.muted },
};
const percentage = (share: number) => new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 }).format(share);

export default function MonthlyRoute() {
  const { month } = useLocalSearchParams<{ month?: string | string[] }>();
  const current = romeDate().slice(0, 7);
  let initialMonth = current;
  try { if (typeof month === 'string' && month <= current) { monthStart(month); initialMonth = month; } } catch { /* Ignore invalid navigation parameters. */ }
  return <MonthlyBalance key={initialMonth} initialMonth={initialMonth} />;
}
function MonthlyBalance({ initialMonth }: { initialMonth: string }) {
  const { state, setWeek } = useRuntime();
  const today = romeDate();
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(initialMonth);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  if (!state) return null;
  const total = monthlySummary(state, month);
  const calendar = monthlyCalendar(state, month);
  const selected = calendar.find(row => row.weekStart === selectedWeek);
  const selectMonth = (next: string) => { setMonth(next); setSelectedWeek(null); };
  const missing = total.missingWeeks.length;
  return <Page title="Bilancio mensile" >
    <Button title="Vista annuale" secondary onPress={() => router.push({ pathname: '/anno', params: { year: month.slice(0, 4) } })} />
    <Button title="Confronta due mesi" secondary onPress={() => router.push({ pathname: '/confronto', params: { month } })} />
    <Card>
      <View style={styles.row}>
        <Button title="‹" secondary disabled={month <= MIN_MONTH} onPress={() => selectMonth(shiftMonth(month, -1))} />
        <Text accessibilityLiveRegion="polite" style={[styles.subheading, { flex: 1, textAlign: 'center', textTransform: 'capitalize' }]}>{displayMonth(`${month}-01`)}</Text>
        <Button title="›" secondary disabled={month >= currentMonth || month >= MAX_MONTH} onPress={() => selectMonth(shiftMonth(month, 1))} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {weekdays.map(day => <Text key={day} style={[styles.muted, { flex: 1, textAlign: 'center', fontSize: 11 }]}>{day}</Text>)}
        <Text style={[styles.muted, { width: 30, textAlign: 'center', fontSize: 10 }]}>Esito</Text>
      </View>
      {calendar.map(row => {
        const result = closureStyles[row.closure];
        const active = row.weekStart === selectedWeek;
        return <Pressable key={row.weekStart} accessibilityRole="button"
          accessibilityLabel={`Settimana dal ${displayDate(row.weekStart)} al ${displayDate(row.weekEnd)}. ${result.label}. Tocca per i dettagli.`}
          accessibilityState={{ selected: active }} onPress={() => setSelectedWeek(active ? null : row.weekStart)}
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, borderRadius: 10,
            backgroundColor: active ? colors.raised : 'transparent' }}>
          {row.days.map(day => <View key={day} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ minWidth: 26, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8,
              backgroundColor: day === today ? colors.accent : 'transparent' }}>
              <Text style={{ fontSize: 14, color: day === today ? colors.onAccent : day.slice(0, 7) === month ? colors.ink : colors.muted,
                fontWeight: day === today ? '800' : '400' }}>{Number(day.slice(8))}</Text>
            </View>
          </View>)}
          <Text style={{ width: 30, textAlign: 'center', fontSize: 22, fontWeight: '600', color: result.color }}>{result.symbol}</Text>
        </Pressable>;
      })}
      <Text style={styles.muted}>+ positivo · − negativo · = in pari{ '\n' }… in corso · ? incasso mancante · · futura</Text>
      
      {month !== currentMonth && <Button title="Torna al mese corrente" secondary onPress={() => selectMonth(currentMonth)} />}
    </Card>
    {selected && <Card>
      <Text style={styles.subheading}>Settimana selezionata</Text>
      <Text style={styles.muted}>{displayDate(selected.weekStart)} — {displayDate(selected.weekEnd)}</Text>
      <Text style={[styles.text, { color: closureStyles[selected.closure].color, fontWeight: '700' }]}>{closureStyles[selected.closure].label}</Text>
      <View style={styles.row}><Text style={styles.text}>Entrate</Text><Text style={styles.text}>{money(selected.total.income)}</Text></View>
      <View style={styles.row}><Text style={styles.text}>Uscite</Text><Text style={styles.text}>{money(selected.total.expenses)}</Text></View>
      {selected.total.refunds>0&&<View style={styles.row}><Text style={styles.text}>Rimborsi ricevuti</Text><Text style={styles.text}>{money(selected.total.refunds)}</Text></View>}
      <View style={styles.row}><Text style={styles.label}>Saldo{!selected.total.hasCashIncome ? ' parziale' : ''}</Text><Text style={styles.subheading}>{money(selected.total.balance)}</Text></View>
      <Button title={selected.total.hasCashIncome ? 'Modifica incasso settimanale' : 'Inserisci incasso settimanale'} secondary onPress={() => { setWeek(selected.weekStart); router.push({ pathname: '/incasso', params: { week: selected.weekStart } }); }} />
    </Card>}
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 14 }}>
      <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>RISULTATO DEL MESE</Text>
      <Text style={{ color: colors.white, fontSize: 32, fontWeight: '600' }}>{total.balance > 0 ? '+' : ''}{money(total.balance)}</Text>
      {total.refunds>0&&<Text style={{color:colors.white}}>Rimborsi ricevuti: {money(total.refunds)}</Text>}
      <Text style={{ color: colors.muted, fontWeight: '700' }}>{total.balance > 0 ? 'Mese in positivo' : total.balance < 0 ? 'Mese in negativo' : 'Mese in pari'}{missing ? ' · saldo parziale' : month === currentMonth ? ' · in corso' : ''}</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 15, gap: 12 }}>
        <View style={styles.row}><Text style={{ color: colors.muted }}>Entrate totali</Text><Text style={{ color: colors.white, fontSize: 20, fontWeight: '700' }}>{money(total.income)}</Text></View>
        <View style={styles.row}><Text style={{ color: colors.muted }}>Uscite totali</Text><Text style={{ color: colors.white, fontSize: 20, fontWeight: '700' }}>{money(total.expenses)}</Text></View>
      </View>
    </View>
    <Card><Text style={styles.subheading}>Incassi del mese</Text>
      <Text style={styles.text}>Incassi settimanali conteggiati: {money(total.cashIncome)}.{total.otherIncome > 0 ? ` Altre entrate: ${money(total.otherIncome)}.` : ''}</Text>
      {!!missing && <Text style={styles.error}>Mancano {missing === 1 ? 'l’incasso di una settimana già iniziata' : `gli incassi di ${missing} settimane già iniziate`}. Inserisci anche zero se non hai incassato.</Text>}
      
      
    </Card>
    <Card><Text style={styles.subheading}>Classifica delle categorie</Text>
      {total.refunds>0&&<Text style={styles.muted}>Importi delle spese prima dei rimborsi, mostrati separatamente nel bilancio.</Text>}
      
      {total.categoryExpenses.length === 0 ? <Text style={styles.text}>Nessuna spesa inclusa nel mese.</Text> : total.categoryExpenses.map((category, index) => <View key={category.categoryId} style={{ gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
        <Text style={[styles.text, { fontWeight: '700' }]}>{index + 1}. {state.categories.find(c => c.id === category.categoryId)?.name ?? 'Categoria'}</Text>
        <View style={styles.row}><Text style={styles.subheading}>{money(category.cents)}</Text><Text style={[styles.text, { color: colors.accent, fontWeight: '700' }]}>{percentage(category.share)}</Text></View>
        <View style={{ height: 5, backgroundColor: colors.input, borderRadius: 5 }}><View style={{ height: 5, backgroundColor: colors.accent, borderRadius: 5, width: `${category.share * 100}%` }} /></View>
      </View>)}
    </Card>
  </Page>;
}
