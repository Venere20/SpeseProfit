import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ExpenseTemplate } from '../src/domain/model';
import { money, parseMoney } from '../src/domain/ledger';
import { Button, Card, Choice, Choices, Field, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { styles } from '../src/ui/theme';

export default function QuickEntry() {
  const { state, busy } = useRuntime();
  const [editing, setEditing] = useState<string | null>(null);
  if (!state) return null;
  const templates = state.expenseTemplates ?? [];
  const selected = templates.find(t => t.id === editing);
  if (editing !== null) {
    if (editing !== 'new' && !selected) return <Page title="Modello non disponibile"><Button title="Torna ai modelli" onPress={() => setEditing(null)} /></Page>;
    return <TemplateEditor key={editing} template={selected} onClose={() => setEditing(null)} />;
  }
  return <Page title="Inserimento rapido" >
    <Button title="Crea un modello" disabled={busy} onPress={() => setEditing('new')} />
    {templates.length === 0 && <Card><Text style={styles.subheading}>Le tue spese frequenti</Text>
      <Text style={styles.text}>Nessun modello.</Text>
      
    </Card>}
    {templates.map(template => <Card key={template.id}>
      <View style={styles.row}><Text style={[styles.subheading, { flex: 1 }]}>{template.description}</Text><Text style={styles.subheading}>{money(template.cents)}</Text></View>
      <Text style={styles.muted}>{template.categoryId ? state.categories.find(c => c.id === template.categoryId)?.name ?? 'Categoria' : 'Categoria automatica'} · {template.origin === 'card' ? 'Carta' : 'Contanti'}</Text>
      <Button title="Usa modello" disabled={busy} onPress={() => router.push({ pathname: '/spesa', params: { template: template.id } })} />
      <Button title="Modifica modello" secondary disabled={busy} onPress={() => setEditing(template.id)} />
    </Card>)}
  </Page>;
}
function TemplateEditor({ template, onClose }: { template?: ExpenseTemplate; onClose: () => void }) {
  const { state, run, busy } = useRuntime();
  const [description, setDescription] = useState(template?.description ?? '');
  const [amount, setAmount] = useState(template ? (template.cents / 100).toFixed(2).replace('.', ',') : '');
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? '');
  const [origin, setOrigin] = useState<ExpenseTemplate['origin']>(template?.origin ?? 'card');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  return <Page title={confirmDelete ? 'Elimina modello' : template ? 'Modifica modello' : 'Nuovo modello'}
    >
    <Card>{confirmDelete && template ? <>
      <Text style={styles.text}>Eliminare il modello “{template.description}” da {money(template.cents)}?</Text>
      <Text style={styles.muted}>Le spese già registrate restano nel bilancio.</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button title="Conferma eliminazione del modello" busy={busy} onPress={() => { setError(''); void run(s => s.deleteExpenseTemplate(template.id)).then(onClose).catch(e => setError(e.message)); }} />
      <Button title="Mantieni modello" secondary disabled={busy} onPress={() => { setConfirmDelete(false); setError(''); }} />
    </> : <>
      <Field label="Descrizione del modello" value={description} onChangeText={setDescription} placeholder="Caffè" maxLength={200} editable={!busy} />
      <Field label="Importo abituale (€)" value={amount} onChangeText={setAmount} placeholder="1,20" keyboardType="decimal-pad" editable={!busy} />
      <Text style={styles.label}>Pagamento</Text><Choices>
        <Choice label="Carta" selected={origin === 'card'} disabled={busy} onPress={() => setOrigin('card')} />
        <Choice label="Contanti" selected={origin === 'cash'} disabled={busy} onPress={() => setOrigin('cash')} />
      </Choices>
      <Text style={styles.label}>Categoria</Text><Choices>
        <Choice label="Automatica" selected={categoryId === ''} disabled={busy} onPress={() => setCategoryId('')} />
        {state?.categories.filter(c => c.kind === 'expense').map(c => <Choice key={c.id} label={c.name} selected={categoryId === c.id} disabled={busy} onPress={() => setCategoryId(c.id)} />)}
      </Choices>
      
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button title="Salva modello" busy={busy} onPress={() => {
        setError('');
        try {
          const cents = parseMoney(amount);
          void run(s => s.saveExpenseTemplate({ description, cents, categoryId, origin }, template?.id)).then(onClose).catch(e => setError(e.message));
        } catch (e) { setError((e as Error).message); }
      }} />
      <Button title="Annulla" secondary disabled={busy} onPress={onClose} />
      {template && <Button title="Elimina modello…" secondary disabled={busy} onPress={() => { setConfirmDelete(true); setError(''); }} />}
    </>}</Card>
  </Page>;
}
