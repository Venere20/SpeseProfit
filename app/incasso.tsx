import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, ToastAndroid } from 'react-native';
import { money, parseMoney, romeDate, weekOf } from '../src/domain/ledger';
import { weekLabel } from '../src/domain/analysis';
import { Button, Card, Field, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { styles } from '../src/ui/theme';
export default function CashIncome() {
  const {week:requested}=useLocalSearchParams<{week?:string}>();
  const [week]=useState(()=>{try{if(typeof requested==='string'&&weekOf(requested)===requested)return requested;}catch{}return weekOf(romeDate());});
  const {state,run,busy}=useRuntime();const previous=state?.cashIncome[week];const [value,setValue]=useState(previous===undefined?'':String(previous/100).replace('.',','));const [error,setError]=useState('');const saving=useRef(false);
  const save=()=>{if(saving.current)return;try{const cents=parseMoney(value);saving.current=true;void run(s=>s.setWeeklyCashIncome(week,cents)).then(()=>{ToastAndroid.show('Totale settimanale salvato',ToastAndroid.SHORT);router.back();}).catch(e=>{saving.current=false;setError(e.message);});}catch{setError('Inserisci un importo valido. Anche zero è ammesso.');}};
  return <Page title="Incasso settimanale"><Card><Text style={styles.muted}>{week===weekOf(romeDate())?'Settimana corrente':'Settimana selezionata'}</Text><Text style={styles.subheading}>{weekLabel(week)}</Text>{previous!==undefined&&<Text style={styles.text}>Totale attualmente registrato: {money(previous)}</Text>}</Card><Card>
    <Field label="Totale incassato (€)" value={value} onChangeText={v=>{setValue(v);setError('');}} keyboardType="decimal-pad" placeholder="0,00" editable={!busy} error={error}/>
    <Text style={styles.muted}>Il nuovo importo sostituirà il totale precedente della settimana.</Text><Button title={previous===undefined?'Salva totale settimanale':'Aggiorna totale'} disabled={!value.trim()} busy={busy} onPress={save}/><Button title="Nessun incasso: imposta zero" secondary disabled={busy} onPress={()=>setValue('0,00')}/>
  </Card></Page>;
}
