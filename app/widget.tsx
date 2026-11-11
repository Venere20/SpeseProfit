import { useEffect, useState } from 'react';
import { Text, View, Pressable, ToastAndroid } from 'react-native';
import { WidgetShortcut } from '../src/domain/model';
import { parseMoney, romeDate, widgetSnapshot, widgetView } from '../src/domain/ledger';
import { shortcutFromTemplate, shortcutsFor } from '../src/domain/shortcuts';
import { weekLabel } from '../src/domain/analysis';
import { Button, Card, Choice, Choices, Field, Page } from '../src/ui/components';
import { CategoryPicker } from '../src/ui/CategoryPicker';
import { Icon, shortcutIcon } from '../src/ui/Icon';
import { useRuntime } from '../src/ui/context';
import { colors, styles } from '../src/ui/theme';
import { widgetQueueStatus, widgetQuickAvailable } from '../src/adapters/native/widget';
export default function WidgetSettings() {
  const {state,run,busy,discardPendingWidget,lock,publishedWidgetSnapshot,widgetPublishError}=useRuntime();const [shortcuts,setShortcuts]=useState(()=>state?shortcutsFor(state):[]);
  const [amounts,setAmounts]=useState(()=>shortcuts.map(s=>s.cents===undefined?'':String(s.cents/100).replace('.',',')));
  const [names,setNames]=useState(()=>shortcuts.map(s=>s.label));
  const [selected,setSelected]=useState(0);const [queue,setQueue]=useState({count:0,error:false,counts:[0,0,0]});const [error,setError]=useState('');const [confirm,setConfirm]=useState(false);const [now,setNow]=useState(new Date());
  const refresh=async()=>{const q=await widgetQueueStatus();setQueue({count:q.count,error:q.error,counts:q.counts??[0,0,0]});return q;};
  useEffect(()=>{const first=setTimeout(()=>{void refresh().catch(()=>setError('Impossibile verificare la coda.'));},0);const timer=setInterval(()=>{setNow(new Date());void refresh().catch(()=>undefined);},5000);return()=>{clearTimeout(first);clearInterval(timer);};},[]);
  if(!state)return null;const active=shortcuts[selected]!;const view=widgetView(widgetSnapshot(state,now),now);
  const update=(change:Partial<WidgetShortcut>)=>setShortcuts(all=>all.map((s,i)=>i===selected?{...s,...change}:s));
  const amountError=(value:string)=>{if(!value.trim())return '';try{if(parseMoney(value)<=0)return 'Inserisci un importo maggiore di zero.';}catch{return 'Inserisci un importo valido.';}return '';};
  const valid=shortcuts.every((s,i)=>s.label.trim()&&s.categoryId&&!amountError(amounts[i]??''));
  const save=()=>{setError('');try{const next=shortcuts.map((s,i)=>({...s,cents:amounts[i]?.trim()?parseMoney(amounts[i]!):undefined}));void run(s=>s.configureWidgetShortcuts(next)).then(async()=>{const result=await refresh();if(result.error)setError('Configurazione salvata. Widget da verificare: riapri l’app per riprovare.');else ToastAndroid.show('Configurazione salvata',ToastAndroid.SHORT);}).catch(()=>setError('Non è stato possibile aggiornare la configurazione.'));}catch(e){setError((e as Error).message);}};
  return <Page title="Personalizza widget">
    <View style={{flexDirection:'row',gap:8}}>{shortcuts.map((s,index)=><Pressable key={index} accessibilityRole="radio" accessibilityLabel={`Scorciatoia ${index+1}, ${s.label}`} accessibilityState={{checked:selected===index}} onPress={()=>setSelected(index)} style={{flex:1,gap:8,padding:12,borderRadius:14,backgroundColor:selected===index?colors.raised:colors.card,borderWidth:1,borderColor:selected===index?colors.accent:colors.line}}><Text style={styles.muted}>{index+1}</Text><Icon name={shortcutIcon(s.categoryId,s.label)}/><Text style={styles.text}>{s.label}</Text></Pressable>)}</View>
    <Card><Text style={styles.subheading}>Scorciatoia {selected+1}</Text><Choices><Choice label="Categoria" selected={active.type==='category'} onPress={()=>update({type:'category',label:state.categories.find(c=>c.id===active.categoryId)?.name??active.label})}/><Choice label="Spesa frequente" selected={active.type==='frequent'} onPress={()=>update({type:'frequent',label:names[selected]??active.label})}/></Choices>
      {active.type==='frequent'&&<Field label="Nome della spesa frequente" value={active.label} maxLength={40} onChangeText={label=>{update({label});setNames(all=>all.map((v,i)=>i===selected?label:v));}} error={!active.label.trim()?'Inserisci un nome.':undefined}/>}
      <CategoryPicker categories={state.categories.filter(c=>c.kind==='expense')} value={active.categoryId} onChange={categoryId=>update({categoryId,...(active.type==='category'?{label:state.categories.find(c=>c.id===categoryId)?.name??active.label}:{})})}/>
      <Field label="Importo preimpostato (€), facoltativo" value={amounts[selected]??''} onChangeText={value=>setAmounts(all=>all.map((v,i)=>i===selected?value:v))} error={amountError(amounts[selected]??'')} keyboardType="decimal-pad" placeholder="0,00"/>
      <Field label="Descrizione preimpostata (facoltativa)" value={active.description} onChangeText={description=>update({description})} maxLength={200}/>
      <Text style={styles.label}>Pagamento</Text><Choices><Choice label="Carta" selected={active.origin==='card'} onPress={()=>update({origin:'card'})}/><Choice label="Contanti" selected={active.origin==='cash'} onPress={()=>update({origin:'cash'})}/></Choices>
      {(state.expenseTemplates?.length??0)>0&&<><Text style={styles.label}>Usa una spesa frequente salvata</Text><Choices>{state.expenseTemplates?.map(t=><Choice key={t.id} label={t.description} selected={false} onPress={()=>{const shortcut=shortcutFromTemplate(state,t);update(shortcut);setNames(all=>all.map((v,i)=>i===selected?shortcut.label:v));setAmounts(all=>all.map((v,i)=>i===selected?String(t.cents/100).replace('.',','):v));}}/>)}</Choices></>}
      {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Button title="Salva configurazione" busy={busy} disabled={!valid||!widgetQuickAvailable} onPress={save}/>
    </Card>
    <Text style={styles.subheading}>Anteprima widget · calcolo locale</Text><Text style={styles.muted}>{publishedWidgetSnapshot?'Ultimo aggiornamento confermato: '+new Date(publishedWidgetSnapshot.calculatedAt).toLocaleString('it-IT',{timeZone:'Europe/Rome'}):'Nessun aggiornamento confermato'}</Text>{widgetPublishError&&<Text accessibilityRole="alert" style={styles.error}>Pubblicazione del saldo non riuscita. Il widget può mostrare dati precedenti.</Text>}<View style={{backgroundColor:colors.brand,borderRadius:22,padding:12,gap:10}}><View style={styles.row}><Icon name="wallet" size={20}/><Text style={[styles.text,{color:colors.accent,flex:1}]}>SpeseProfit</Text><Icon name="lock" size={16}/></View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><View style={{width:'48%',padding:12,borderRadius:14,backgroundColor:colors.input,gap:6}}><Icon name={view.state==='positive'?'up':view.state==='negative'?'down':'warning'}/><Text style={styles.muted}>Bilancio</Text><Text style={styles.text}>{view.label}</Text><Text style={styles.muted}>{weekLabel(romeDate(now),false)}</Text><Text style={styles.muted}>{queue.count?'Calcolo locale · spese in attesa':'Calcolo locale'}</Text></View>
      {shortcuts.map((s,i)=><View key={i} style={{width:'48%',padding:12,borderRadius:14,backgroundColor:colors.raised,gap:6}}><View style={styles.row}><Icon name={shortcutIcon(s.categoryId,s.label)}/>{queue.counts[i]!>0&&<Text style={{color:colors.onAccent,backgroundColor:colors.accent,padding:5,borderRadius:12}}>{queue.counts[i]}</Text>}</View><Text style={styles.text}>{s.label}</Text><Text style={styles.muted}>{s.type==='category'?'Categoria':'Spesa frequente'}</Text><Text style={styles.muted}>{queue.counts[i]?`${queue.counts[i]} in attesa`:'+ Spesa rapida'}</Text></View>)}</View>
      {queue.count>0&&<Text style={styles.muted}>{queue.count} spese in attesa</Text>}
    </View>
    {(queue.count!==0||queue.error)&&<Card><Text style={styles.subheading}>{queue.error?'Coda da verificare':`${queue.count} spese in attesa`}</Text><Button title="Blocca e sblocca per riprovare" secondary onPress={lock}/>{confirm?<><Text style={styles.error}>Eliminare definitivamente tutte le richieste in attesa? Non saranno registrate nel bilancio.</Text><Button title="Conferma eliminazione richieste" onPress={()=>{void discardPendingWidget().then(async()=>{setConfirm(false);await refresh();}).catch(()=>setError('Eliminazione non completata.'));}}/><Button title="Mantieni richieste" secondary onPress={()=>setConfirm(false)}/></>:<Button title="Elimina richieste in attesa…" secondary onPress={()=>setConfirm(true)}/>}</Card>}
  </Page>;
}
