import { useEffect, useRef, useState } from 'react';
import { Alert, Text, ToastAndroid } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { ExpenseTemplate, Transaction } from '../domain/model';
import { categoryFor, money, parseMoney, romeDate } from '../domain/ledger';
import { Button, Card, Choice, Choices, Field, Page } from './components';
import { useRuntime } from './context';
import { DateField } from './DateField';
import { CategoryPicker } from './CategoryPicker';
import { styles } from './theme';
export function ExpenseEditor({ item, draft }: { item?:Transaction; draft?:Partial<ExpenseTemplate> }) {
  const {state,run,busy}=useRuntime();const navigation=useNavigation();const saving=useRef(false);
  const initial={amount:item?String(-item.cents/100).replace('.',','):draft?.cents?String(draft.cents/100).replace('.',','):'',category:item?(item.manualCategory?item.categoryId:''):(draft?.categoryId??'food'),description:item?.description??draft?.description??'',date:item?.date??romeDate(),origin:item?.origin??draft?.origin??'card'};
  const [amount,setAmount]=useState(initial.amount);const [category,setCategory]=useState(initial.category);const [description,setDescription]=useState(initial.description);const [date,setDate]=useState(initial.date);const [origin,setOrigin]=useState<'card'|'cash'|'account'>(initial.origin);
  const [classification,setClassification]=useState<Transaction['classification']>(item?.classification??'included');const [rule,setRule]=useState(false);const [ruleText,setRuleText]=useState('');const [error,setError]=useState('');const [touched,setTouched]=useState(false);const [saved,setSaved]=useState(false);
  const [pending,setPending]=useState(false);
  const dirty=amount!==initial.amount||category!==initial.category||description!==initial.description||date!==initial.date||origin!==initial.origin||classification!==(item?.classification??'included')||rule;
  usePreventRemove(!saved&&(dirty||busy||pending),({data})=>{
    const wait=()=>Alert.alert('Salvataggio in corso','Attendi il completamento.');
    if(saving.current||busy){wait();return;}
    Alert.alert('Vuoi uscire senza salvare?','Le modifiche non salvate saranno perse.',[{text:'Continua a modificare',style:'cancel'},{text:'Esci',style:'destructive',onPress:()=>{if(saving.current){wait();return;}navigation.dispatch(data.action);}}]);
  });
  useEffect(()=>{if(saved){ToastAndroid.show(item?'Movimento aggiornato':'Spesa aggiunta',ToastAndroid.SHORT);router.back();}},[saved,item]);
  let cents=0;let amountError='';try{cents=parseMoney(amount);if(cents<=0)amountError='Inserisci un importo valido maggiore di zero.';}catch{amountError=amount.trim()?'Inserisci un importo valido maggiore di zero.':'Inserisci un importo.';}
  if(!state)return null;const effectiveCategory=category||categoryFor(state,description,-Math.max(1,cents));const inferred=state.categories.find(c=>c.id===effectiveCategory)?.name??'Da categorizzare';const save=()=>{if(saving.current||busy)return;setTouched(true);if(amountError)return;setError('');saving.current=true;setPending(true);
    const input={cents,categoryId:category,description:description.trim()||state.categories.find(c=>c.id===effectiveCategory)?.name||'Spesa',date,origin};
    const operation=item?run(s=>s.updateExpense(item.id,{...input,classification},rule?ruleText:undefined)):run(s=>s.addExpense(input));
    void operation.then(()=>setSaved(true)).catch(e=>{saving.current=false;setPending(false);setError((e as Error).message||'Non è stato possibile salvare la spesa. Riprova.');});};
  return <Page title={item?'Modifica spesa':'Nuova spesa'}><Card>
    <Field label="Importo (€)" placeholder="0,00" value={amount} onChangeText={setAmount} onBlur={()=>setTouched(true)} error={touched||amount?amountError:undefined} keyboardType="decimal-pad" editable={!busy}/>
    <CategoryPicker categories={state.categories.filter(c=>c.kind==='expense')} value={category} onChange={setCategory} disabled={busy} automaticLabel={`Automatica · ${inferred}`}/>
    <Field label="Descrizione (facoltativa)" placeholder="Es. Supermercato" value={description} onChangeText={setDescription} maxLength={200} editable={!busy}/>
    <DateField label="Data" value={date} onChange={setDate} disabled={busy}/>
    <Text style={styles.label}>Pagamento</Text><Choices><Choice label="Carta" selected={origin==='card'} onPress={()=>setOrigin('card')} disabled={busy}/><Choice label="Contanti" selected={origin==='cash'} onPress={()=>setOrigin('cash')} disabled={busy}/></Choices>
    {item&&<><Text style={styles.label}>Come incide sul bilancio</Text><Choices>{(['included','transfer','excluded'] as const).map(c=><Choice key={c} label={{included:'Incluso',transfer:'Trasferimento',excluded:'Escluso'}[c]} selected={classification===c} disabled={busy} onPress={()=>setClassification(c)}/>)}</Choices><Choice label="Memorizza una regola per questa categoria" selected={rule} disabled={busy} onPress={()=>setRule(!rule)}/>{rule&&<Field label="Testo da riconoscere (almeno 3 caratteri)" value={ruleText} onChangeText={setRuleText} maxLength={200}/>}</>}
    {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button title={item?'Salva modifiche':'Salva spesa'} busy={busy} disabled={!!amountError} onPress={save}/>
  </Card>{!item&&<Button title="Usa un modello rapido" secondary onPress={()=>router.push('/rapido')}/>}{item&&<Text style={styles.muted}>Importo registrato: {money(-item.cents)}</Text>}</Page>;
}
