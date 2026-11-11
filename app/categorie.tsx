import { useState } from 'react';
import { Text, View } from 'react-native';
import { CategoryKind } from '../src/domain/model';
import { Button, Card, Choice, Choices, Field, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { styles } from '../src/ui/theme';
export default function Categories() {
  const { state, run, busy } = useRuntime(); const [name, setName] = useState(''); const [kind, setKind] = useState<CategoryKind>('expense'); const [error, setError] = useState('');
  return <Page title="Categorie" >
    <Card><Text style={styles.subheading}>Nuova categoria</Text><Field label="Nome" value={name} onChangeText={setName} maxLength={40} />
      <Choices><Choice label="Spesa" selected={kind === 'expense'} onPress={() => setKind('expense')} /><Choice label="Entrata" selected={kind === 'income'} onPress={() => setKind('income')} /></Choices>
      {!!error && <Text style={styles.error}>{error}</Text>}<Button title="Aggiungi categoria" busy={busy} onPress={() => { setError(''); void run(s => s.addCategory(name, kind)).then(() => setName('')).catch(e => setError(e.message)); }} />
    </Card>
    <Card><Text style={styles.subheading}>Le categorie disponibili</Text>{state?.categories.map(c => <View key={c.id} style={styles.row}><Text style={styles.text}>{c.name}</Text><Text style={styles.muted}>{c.kind === 'expense' ? 'Spesa' : 'Entrata'}</Text></View>)}</Card>
    <Card><Text style={styles.subheading}>Regole personalizzate</Text>{state?.rules.length ? state.rules.map(r => <Text key={r.id} style={styles.text}>“{r.match}” → {state.categories.find(c => c.id === r.categoryId)?.name}</Text>) : <Text style={styles.muted}>Nessuna regola.</Text>}</Card>
  </Page>;
}
