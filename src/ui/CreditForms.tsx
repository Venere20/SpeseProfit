import { useEffect, useRef, useState } from 'react';
import { Alert, Text } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { LedgerService } from '../application/ledgerService';
import { Loan, LoanRepayment, Transaction } from '../domain/model';
import { loanRemaining, refundedCents } from '../domain/credits';
import { money, parseMoney, romeDate } from '../domain/ledger';
import { useRuntime } from './context';
import { Button, Card, Choice, Choices, EmptyState, Field, Page, Sheet } from './components';
import { DateField } from './DateField';
import { styles } from './theme';
function useCreditForm(dirty: boolean) {
  const { run, busy } = useRuntime(); const navigation = useNavigation();
  const pending = useRef(false); const [saved, setSaved] = useState(false); const [error, setError] = useState('');
  usePreventRemove(!saved && (dirty || busy), ({ data }) => {
    if (pending.current) { Alert.alert('Salvataggio in corso', 'Attendi il completamento.'); return; }
    Alert.alert('Uscire senza salvare?', 'Le modifiche non salvate saranno perse.', [{ text: 'Continua', style: 'cancel' }, { text: 'Esci', style: 'destructive', onPress: () => navigation.dispatch(data.action) }]);
  });
  useEffect(() => { if (saved) { if (router.canGoBack()) router.back(); else router.replace('/rimborsi-prestiti'); } }, [saved]);
  const submit = (action: (s: LedgerService) => ReturnType<LedgerService['saveLoan']>) => {
    if (pending.current || busy) return; pending.current = true; setError('');
    void run(action).then(() => setSaved(true)).catch(e => { pending.current = false; setError((e as Error).message || 'Salvataggio non riuscito. Riprova.'); });
  };
  return { busy, error, submit };
}
function amountError(value: string) { try { if (parseMoney(value) > 0) return ''; } catch {} return 'Inserisci un importo valido maggiore di zero.'; }
function Payment({ value, change, disabled }: { value: 'card' | 'cash' | 'account'; change: (v: 'card' | 'cash' | 'account') => void; disabled: boolean }) {
  return <><Text style={styles.label}>Metodo</Text><Choices><Choice label="Carta / conto" selected={value === 'card'} onPress={() => change('card')} disabled={disabled}/><Choice label="Contanti" selected={value === 'cash'} onPress={() => change('cash')} disabled={disabled}/></Choices></>;
}
export function RefundForm({ item, expenseId }: { item?: Transaction; expenseId?: string }) {
  const { state } = useRuntime();
  const [initial] = useState(() => ({ amount: item ? String(item.cents / 100).replace('.', ',') : '', description: item?.description ?? '', date: item?.date ?? romeDate(), origin: item?.origin ?? 'card', refundFor: item?.refundFor ?? expenseId ?? '' }));
  const [value, setValue] = useState(initial); const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [limit, setLimit] = useState(30);
  const { busy, error, submit } = useCreditForm(JSON.stringify(value) !== JSON.stringify(initial));
  if (!state) return null;
  const expense = state.transactions.find(t => t.id === value.refundFor && t.cents < 0);
  const maximum = expense ? -expense.cents - refundedCents(state, expense.id, item?.id) : undefined;
  const remaining = expense ? -expense.cents - refundedCents(state, expense.id) : undefined;
  const candidates = state.transactions.filter(t => t.cents < 0 && t.classification === 'included' && t.date <= romeDate() && -t.cents - refundedCents(state, t.id, item?.id) > 0 && t.description.toLocaleLowerCase('it-IT').includes(query.toLocaleLowerCase('it-IT'))).sort((a, b) => b.date.localeCompare(a.date));
  const update = (change: Partial<typeof value>) => setValue(v => ({ ...v, ...change })); const invalid = amountError(value.amount);
  return <Page title={item ? 'Modifica rimborso' : 'Registra rimborso'}><Card>
    <Field label="Importo ricevuto (€)" value={value.amount} onChangeText={amount => update({ amount })} keyboardType="decimal-pad" placeholder="0,00" error={value.amount ? invalid : undefined} editable={!busy}/>
    <Button title={expense ? `Spesa: ${expense.description}` : 'Collega a una spesa (facoltativo)'} secondary disabled={busy} onPress={() => setOpen(true)}/>
    {item && maximum !== undefined && <Text style={styles.text}>Importo massimo per questo rimborso: {money(maximum)}</Text>}
    {remaining !== undefined && <Text style={styles.text}>Ancora rimborsabile: {money(remaining)}</Text>}
    <Field label="Descrizione (facoltativa)" value={value.description} onChangeText={description => update({ description })} maxLength={200} editable={!busy}/>
    <DateField label="Data di ricezione" value={value.date} onChange={date => update({ date })} disabled={busy}/>
    <Payment value={value.origin} change={origin => update({ origin })} disabled={busy}/>
    <Text style={styles.muted}>Il rimborso migliora il bilancio alla data di ricezione ed è mostrato separatamente dagli incassi.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button title={item ? 'Salva rimborso' : 'Aggiungi rimborso'} busy={busy} disabled={!!invalid} onPress={() => submit(s => s.saveRefund({ date: value.date, cents: parseMoney(value.amount), description: value.description.trim() || 'Rimborso', origin: value.origin, ...(value.refundFor ? { refundFor: value.refundFor } : {}) }, item?.id))}/>
    {item && <Button title="Elimina rimborso" secondary disabled={busy} onPress={() => Alert.alert('Elimina rimborso', 'Il rimborso sarà rimosso e il bilancio aggiornato.', [{ text: 'Annulla', style: 'cancel' }, { text: 'Elimina', style: 'destructive', onPress: () => submit(s => s.deleteRefund(item.id)) }])}/>}
  </Card><Sheet visible={open} close={() => setOpen(false)} title="Spesa da rimborsare">
    <Field label="Cerca una spesa" value={query} onChangeText={q => { setQuery(q); setLimit(30); }}/>
    <Button title="Nessun collegamento" secondary onPress={() => { update({ refundFor: '' }); setOpen(false); }}/>
    {candidates.slice(0, limit).map(t => <Button key={t.id} title={`${t.description} · ${t.date} · ${money(-t.cents - refundedCents(state, t.id, item?.id))}`} secondary onPress={() => { update({ refundFor: t.id }); setOpen(false); }}/>) }
    {!candidates.length && <EmptyState title="Nessuna spesa disponibile"/>}{candidates.length > limit && <Button title="Mostra altre spese" secondary onPress={() => setLimit(n => n + 30)}/>}
  </Sheet></Page>;
}
export function LoanForm({ item }: { item?: Loan }) {
  const [initial] = useState(() => ({ amount: item ? String(item.cents / 100).replace('.', ',') : '', person: item?.person ?? '', direction: item?.direction ?? 'lent', date: item?.date ?? romeDate(), origin: item?.origin ?? 'card', note: item?.note ?? '', hasDue: !!item?.dueDate, dueDate: item?.dueDate ?? romeDate() }));
  const [value, setValue] = useState(initial); const { busy, error, submit } = useCreditForm(JSON.stringify(value) !== JSON.stringify(initial));
  const update = (change: Partial<typeof value>) => setValue(v => ({ ...v, ...change })); const invalid = amountError(value.amount);
  return <Page title={item ? 'Modifica prestito' : 'Registra prestito'}><Card>
    <Text style={styles.label}>Tipo di prestito</Text><Choices><Choice label="Ho prestato" selected={value.direction === 'lent'} onPress={() => update({ direction: 'lent' })} disabled={busy || !!item?.repayments.length}/><Choice label="Ho ricevuto un prestito" selected={value.direction === 'borrowed'} onPress={() => update({ direction: 'borrowed' })} disabled={busy || !!item?.repayments.length}/></Choices>
    <Field label={value.direction === 'lent' ? 'A chi hai prestato i soldi' : 'Da chi hai ricevuto i soldi'} value={value.person} onChangeText={person => update({ person })} maxLength={80} editable={!busy}/>
    <Field label="Importo prestato (€)" value={value.amount} onChangeText={amount => update({ amount })} keyboardType="decimal-pad" placeholder="0,00" error={value.amount ? invalid : undefined} editable={!busy}/>
    <DateField label="Data del prestito" value={value.date} onChange={date => update({ date })} disabled={busy}/>
    <Payment value={value.origin} change={origin => update({ origin })} disabled={busy}/>
    <Choice label="Scadenza concordata" selected={value.hasDue} onPress={() => update({ hasDue: !value.hasDue })} disabled={busy}/>
    {value.hasDue && <DateField label="Data di scadenza" value={value.dueDate} onChange={dueDate => update({ dueDate })} disabled={busy}/>}
    <Field label="Nota (facoltativa)" value={value.note} onChangeText={note => update({ note })} maxLength={200} editable={!busy}/>
    <Text style={styles.muted}>Prestiti e restituzioni sono separati dal bilancio di incassi e spese.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button title="Salva prestito" busy={busy} disabled={!!invalid || !value.person.trim()} onPress={() => submit(s => s.saveLoan({ direction: value.direction, person: value.person, cents: parseMoney(value.amount), date: value.date, origin: value.origin, note: value.note, ...(value.hasDue ? { dueDate: value.dueDate } : {}) }, item?.id))}/>
  </Card></Page>;
}
export function RepaymentForm({ loan, item }: { loan: Loan; item?: LoanRepayment }) {
  const available = loanRemaining(loan) + (item?.cents ?? 0);
  const [initial] = useState(() => ({ amount: String((item?.cents ?? available) / 100).replace('.', ','), date: item?.date ?? romeDate(), origin: item?.origin ?? loan.origin, note: item?.note ?? '' }));
  const [value, setValue] = useState(initial); const { busy, error, submit } = useCreditForm(JSON.stringify(value) !== JSON.stringify(initial));
  const update = (change: Partial<typeof value>) => setValue(v => ({ ...v, ...change })); const invalid = amountError(value.amount);
  return <Page title={item ? 'Modifica restituzione' : loan.direction === 'lent' ? 'Restituzione ricevuta' : 'Restituzione effettuata'}><Card>
    <Text style={styles.subheading}>{loan.person}</Text><Text style={styles.text}>Quota disponibile: {money(available)}</Text>
    <Field label="Importo restituito (€)" value={value.amount} onChangeText={amount => update({ amount })} keyboardType="decimal-pad" error={value.amount ? invalid : undefined} editable={!busy}/>
    <DateField label="Data della restituzione" value={value.date} onChange={date => update({ date })} disabled={busy}/>
    <Payment value={value.origin} change={origin => update({ origin })} disabled={busy}/>
    <Field label="Nota (facoltativa)" value={value.note} onChangeText={note => update({ note })} maxLength={200} editable={!busy}/>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button title="Salva restituzione" busy={busy} disabled={!!invalid} onPress={() => submit(s => s.saveRepayment(loan.id, { cents: parseMoney(value.amount), date: value.date, origin: value.origin, note: value.note }, item?.id))}/>
    {item && <Button title="Elimina restituzione" secondary disabled={busy} onPress={() => Alert.alert('Elimina restituzione', 'La somma ancora dovuta aumenterà di questo importo.', [{ text: 'Annulla', style: 'cancel' }, { text: 'Elimina', style: 'destructive', onPress: () => submit(s => s.deleteRepayment(loan.id, item.id)) }])}/>}
  </Card></Page>;
}
