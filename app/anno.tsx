import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { displayMonth } from '../src/domain/calendar';
import { money, romeDate } from '../src/domain/ledger';
import { annualSummary } from '../src/domain/reports';
import { Button, Card, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { colors, styles } from '../src/ui/theme';

export default function AnnualRoute() {
  const { year } = useLocalSearchParams<{ year?: string | string[] }>();
  const currentYear = Number(romeDate().slice(0, 4));
  const requested = typeof year === 'string' && /^\d{4}$/.test(year) ? Number(year) : currentYear;
  const initialYear = requested >= 1 && requested <= 9998 && requested <= currentYear ? requested : currentYear;
  return <AnnualBalance key={initialYear} initialYear={initialYear} />;
}
function AnnualBalance({ initialYear }: { initialYear: number }) {
  const { state } = useRuntime();
  const [year, setYear] = useState(initialYear);
  const currentYear = Number(romeDate().slice(0, 4));
  if (!state) return null;
  const total = annualSummary(state, year);
  const maximum = Math.max(1, ...total.months.filter(m => !m.future).map(m => Math.abs(m.balance)));
  const openMonth = (month: string) => router.push({ pathname: '/mese', params: { month } });
  return <Page title="Vista annuale" >
    <View style={styles.row}>
      <Button title="‹" secondary disabled={year <= 1} onPress={() => setYear(y => y - 1)} />
      <Text style={styles.heading}>{year}</Text>
      <Button title="›" secondary disabled={year >= currentYear} onPress={() => setYear(y => y + 1)} />
    </View>
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 14 }}>
      <Text style={{ color: colors.accent, fontWeight: '700' }}>{total.ongoing ? 'RISULTATO DELL’ANNO FINORA' : 'RISULTATO DELL’ANNO'}</Text>
      <Text style={{ color: colors.white, fontSize: 32, fontWeight: '600' }}>{total.balance > 0 ? '+' : ''}{money(total.balance)}</Text>
      <Text style={{ color: colors.muted }}>{!total.hasData ? 'Nessun dato registrato' : total.balance > 0 ? 'In positivo' : total.balance < 0 ? 'In negativo' : 'In pari'}{total.hasData && total.missingWeeks > 0 ? ' · dati incompleti' : ''}</Text>
      {total.refunds>0&&<Text style={{color:colors.white}}>Rimborsi ricevuti: {money(total.refunds)}</Text>}
      <View style={styles.row}><Text style={{ color: colors.muted }}>Entrate totali</Text><Text style={{ color: colors.white, fontSize: 19, fontWeight: '700' }}>{money(total.income)}</Text></View>
      <View style={styles.row}><Text style={{ color: colors.muted }}>Uscite totali</Text><Text style={{ color: colors.white, fontSize: 19, fontWeight: '700' }}>{money(total.expenses)}</Text></View>
    </View>
    <Card><Text style={styles.subheading}>Andamento dei saldi</Text>
      <Text style={styles.muted}>Sinistra: negativo. Destra: positivo. I saldi con incassi mancanti sono parziali.</Text>
      {total.months.map(month => <View key={month.month} accessibilityLabel={`${displayMonth(month.month + '-01')}: ${month.future ? 'mese futuro' : !month.hasData ? 'nessun dato' : money(month.balance)}`} style={styles.row}>
        <Text style={[styles.muted, { width: 30 }]}>{new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: 'UTC' }).format(new Date(month.month + '-01T12:00:00Z'))}</Text>
        <View style={{ flex: 1, height: 18, backgroundColor: colors.input, borderRadius: 5 }}>
          <View style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: colors.line }} />
          {!month.future && month.hasData && month.balance !== 0 && <View style={{ position: 'absolute', top: 3, height: 12,
            left: `${month.balance < 0 ? 50 - Math.abs(month.balance) / maximum * 50 : 50}%`,
            width: `${Math.abs(month.balance) / maximum * 50}%`, borderRadius: 3,
            backgroundColor: month.balance < 0 ? colors.danger : colors.accent }} />}
        </View>
        <Text style={[styles.muted, { width: 94, textAlign: 'right' }]}>{month.future || !month.hasData ? '—' : money(month.balance)}</Text>
      </View>)}
    </Card>
    <Card><Text style={styles.subheading}>I dodici mesi</Text>
      
      {total.months.map(month => <Pressable key={month.month} accessibilityRole="button" disabled={month.future}
        accessibilityState={{ disabled: month.future }} onPress={() => openMonth(month.month)}
        style={{ paddingVertical: 14, gap: 7, borderTopWidth: 1, borderTopColor: colors.line, opacity: month.future ? 0.5 : 1 }}>
        <Text style={[styles.subheading, { textTransform: 'capitalize' }]}>{displayMonth(month.month + '-01')}</Text>
        {month.future ? <Text style={styles.muted}>Mese futuro · non conteggiato</Text> : <>
          <Text style={styles.muted}>Entrate {money(month.income)} · Uscite {money(month.expenses)}{month.refunds?` · Rimborsi ${money(month.refunds)}`:''}</Text>
          <Text style={[styles.text, { fontWeight: '700', color: month.balance < 0 ? colors.danger : colors.accent }]}>
            {!month.hasData ? 'Nessun dato' : `${month.balance > 0 ? '+' : ''}${money(month.balance)}${month.missingWeeks.length ? ' · parziale' : month.balance === 0 ? ' · in pari' : ''}`}
          </Text>
        </>}
      </Pressable>)}
    </Card>
    <Button title="Confronta due mesi" onPress={() => router.push({ pathname: '/confronto', params: { month: total.ongoing ? romeDate().slice(0, 7) : `${String(year).padStart(4, '0')}-12` } })} />
    
  </Page>;
}
