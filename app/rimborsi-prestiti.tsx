import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Loan } from '../src/domain/model';
import { creditOverview, loanRemaining, loanRepaid } from '../src/domain/credits';
import { isRefund, money } from '../src/domain/ledger';
import { displayDate } from '../src/domain/calendar';
import { useRuntime } from '../src/ui/context';
import { useToday } from '../src/ui/useToday';
import { Button, Card, Choice, Choices, EmptyState, Field, Page } from '../src/ui/components';
import { colors, styles } from '../src/ui/theme';
function LoanCard({ loan }: { loan: Loan }) {
  const { run, busy } = useRuntime(); const today = useToday(); const [expanded, setExpanded] = useState(false);
  const remaining = loanRemaining(loan); const overdue = remaining > 0 && !!loan.dueDate && loan.dueDate < today;
  return <Card><Text style={styles.subheading}>{loan.person}</Text>
    <Text style={styles.muted}>{loan.direction === 'lent' ? 'Hai prestato' : 'Hai ricevuto in prestito'} {money(loan.cents)} · {displayDate(loan.date)} · {loan.origin === 'card' ? 'Carta / conto' : 'Contanti'}</Text>
    <View style={styles.row}><Text style={styles.text}>{remaining ? loan.direction === 'lent' ? 'Da ricevere' : 'Da restituire' : 'Chiuso'}</Text><Text style={[styles.subheading, { color: overdue ? colors.danger : remaining ? colors.accent : colors.positive }]}>{money(remaining)}</Text></View>
    <Text style={styles.muted}>Già restituiti: {money(loanRepaid(loan))}</Text>
    {loan.dueDate && <Text style={[styles.text, { color: overdue ? colors.danger : colors.muted }]}>{overdue ? 'Scaduto il' : 'Scadenza'} {displayDate(loan.dueDate)}</Text>}
    {!!loan.note && <Text style={styles.text}>{loan.note}</Text>}
    {remaining > 0 && <Button title={loan.direction === 'lent' ? 'Registra soldi restituiti' : 'Registra restituzione effettuata'} disabled={busy} onPress={() => router.push({ pathname: '/restituzione', params: { loanId: loan.id } })}/>}
    <Button title="Modifica prestito" secondary disabled={busy} onPress={() => router.push({ pathname: '/prestito', params: { id: loan.id } })}/>
    {!!loan.repayments.length && <Button title={`${expanded ? 'Nascondi' : 'Mostra'} restituzioni (${loan.repayments.length})`} secondary onPress={() => setExpanded(!expanded)}/>}
    {expanded && [...loan.repayments].sort((a, b) => b.date.localeCompare(a.date)).map(r => <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Restituzione ${money(r.cents)}, ${displayDate(r.date)}. Modifica`} onPress={() => router.push({ pathname: '/restituzione', params: { loanId: loan.id, id: r.id } })} style={[styles.row, { minHeight: 60, borderTopWidth: 1, borderTopColor: colors.line }]}><View style={{ flex: 1 }}><Text style={styles.text}>{money(r.cents)} · {displayDate(r.date)}</Text><Text style={styles.muted}>{r.origin === 'card' ? 'Carta / conto' : 'Contanti'}{r.note ? ` · ${r.note}` : ''}</Text></View><Text style={styles.muted}>Modifica</Text></Pressable>)}
    <Button title="Elimina prestito" secondary disabled={busy} onPress={() => Alert.alert('Elimina prestito', 'Eliminare questo prestito e tutte le sue restituzioni? Non sarà possibile recuperarli.', [{ text: 'Annulla', style: 'cancel' }, { text: 'Elimina', style: 'destructive', onPress: () => { void run(s => s.deleteLoan(loan.id)).catch(e => Alert.alert('Eliminazione non riuscita', (e as Error).message)); } }])}/>
  </Card>;
}
export default function Credits() {
  const { tab } = useLocalSearchParams<{ tab?: string }>(); const { state } = useRuntime(); const today = useToday();
  const [mode, setMode] = useState<'refunds' | 'loans'>(tab === 'loans' ? 'loans' : 'refunds'); const [query, setQuery] = useState(''); const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all'); const [limit, setLimit] = useState(20);
  if (!state) return null; const overview = creditOverview(state, today); const search = query.trim().toLocaleLowerCase('it-IT');
  const refunds = state.transactions.filter(t => isRefund(t) && t.description.toLocaleLowerCase('it-IT').includes(search)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const loans = (state.loans ?? []).filter(l => `${l.person} ${l.note}`.toLocaleLowerCase('it-IT').includes(search) && (filter === 'all' || (loanRemaining(l) > 0 ? 'open' : 'closed') === filter)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const count = mode === 'refunds' ? refunds.length : loans.length;
  return <Page title="Rimborsi e prestiti"><Choices><Choice label="Rimborsi" selected={mode === 'refunds'} onPress={() => { setMode('refunds'); setQuery(''); setLimit(20); }}/><Choice label="Prestiti" selected={mode === 'loans'} onPress={() => { setMode('loans'); setQuery(''); setLimit(20); }}/></Choices>
    {mode === 'loans' && <Card><Text style={styles.subheading}>Prestiti aperti</Text><View style={styles.row}><Text style={styles.text}>Devi ricevere</Text><Text style={styles.subheading}>{money(overview.receivable)}</Text></View><View style={styles.row}><Text style={styles.text}>Devi restituire</Text><Text style={styles.subheading}>{money(overview.payable)}</Text></View>{!!overview.overdue && <Text style={styles.error}>{overview.overdue} {overview.overdue === 1 ? 'prestito oltre la scadenza' : 'prestiti oltre la scadenza'}</Text>}<Text style={styles.muted}>Queste somme sono separate dal bilancio di incassi e spese.</Text></Card>}
    <Button title={mode === 'refunds' ? 'Aggiungi rimborso' : 'Aggiungi prestito'} onPress={() => router.push(mode === 'refunds' ? '/rimborso' : '/prestito')}/>
    <Field label={mode === 'refunds' ? 'Cerca rimborso' : 'Cerca persona o nota'} value={query} onChangeText={q => { setQuery(q); setLimit(20); }}/>
    {mode === 'loans' && <Choices>{(['all', 'open', 'closed'] as const).map(f => <Choice key={f} label={{ all: 'Tutti', open: 'Aperti', closed: 'Chiusi' }[f]} selected={filter === f} onPress={() => { setFilter(f); setLimit(20); }}/>)}</Choices>}
    {mode === 'refunds' ? refunds.slice(0, limit).map(t => <Card key={t.id}><Pressable accessibilityRole="button" accessibilityLabel={`${t.description}, ${money(t.cents)}. Modifica rimborso`} onPress={() => router.push({ pathname: '/rimborso', params: { id: t.id } })} style={{ minHeight: 64, gap: 8 }}><Text style={styles.subheading}>{t.description}</Text><Text style={[styles.heading, { color: colors.positive }]}>{money(t.cents)}</Text><Text style={styles.muted}>{displayDate(t.date)} · {t.origin === 'card' ? 'Carta / conto' : 'Contanti'}{t.classification !== 'included' ? ' · Escluso dal bilancio' : ''}</Text>{t.refundFor && <Text style={styles.text}>Spesa: {state.transactions.find(e => e.id === t.refundFor)?.description ?? 'Non disponibile'}</Text>}<Text style={{ color: colors.accent }}>Modifica o elimina</Text></Pressable></Card>) : loans.slice(0, limit).map(l => <LoanCard key={l.id} loan={l}/>)}
    {!count && <EmptyState title={query || filter !== 'all' ? 'Nessun risultato' : mode === 'refunds' ? 'Nessun rimborso registrato' : 'Nessun prestito registrato'}/>}
    {count > limit && <Button title="Mostra altri" secondary onPress={() => setLimit(n => n + 20)}/>}
  </Page>;
}
