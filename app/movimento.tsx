import { refundedCents } from '../src/domain/credits';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { money } from '../src/domain/ledger';
import { displayDate } from '../src/domain/calendar';
import { Button, Card, EmptyState, Page } from '../src/ui/components';
import { CategoryIcon } from '../src/ui/Icon';
import { useRuntime } from '../src/ui/context';
import { styles } from '../src/ui/theme';
export default function MovementDetail() {
  const {id}=useLocalSearchParams<{id:string}>();const {state,run,busy}=useRuntime();const item=state?.transactions.find(t=>t.id===id);
  if(!state)return null;if(!item)return <Page title="Dettaglio movimento"><EmptyState title="Movimento non disponibile"/><Button title="Torna ai movimenti" secondary onPress={()=>router.back()}/></Page>;
  return <Page title="Dettaglio movimento"><Card><CategoryIcon id={item.categoryId}/><Text style={[styles.heading,{fontSize:32,fontVariant:['tabular-nums']}]}>{money(item.cents).replace('-','âˆ’')}</Text><Text style={styles.subheading}>{item.description}</Text><View style={styles.divider}/>{item.bankEvent&&<Text style={styles.muted}>{item.bankEvent.status} · Data {item.bankEvent.dateOrigin==='bank'?'bancaria':'del messaggio'}</Text>}
    {[['Categoria',state.categories.find(c=>c.id===item.categoryId)?.name??'Categoria'],['Data',displayDate(item.date)],['Origine',item.bankEvent?'Avviso Fineco · '+item.bankEvent.source:item.id.startsWith('widget:')?'Inserimento rapido dal widget':'Inserimento manuale'],['Pagamento',item.origin==='account'?'Conto / bonifico':item.origin==='card'?'Carta':'Contanti'],['Bilancio',{included:'Incluso',excluded:'Escluso',transfer:'Trasferimento'}[item.classification]]].map(([label,value])=><View key={label} style={styles.row}><Text style={styles.muted}>{label}</Text><Text style={[styles.text,{flex:1,textAlign:'right'}]}>{value}</Text></View>)}
  </Card>{item.cents<0&&item.classification==='included'&&<Card><Text style={styles.text}>Rimborsi ricevuti: {money(refundedCents(state,item.id))}</Text>{-item.cents>refundedCents(state,item.id)&&<Button title="Registra rimborso" secondary onPress={()=>router.push({pathname:'/rimborso',params:{expenseId:item.id}})}/>}<Button title="Apri rimborsi" secondary onPress={()=>router.push('/rimborsi-prestiti')}/></Card>}<Button title="Modifica movimento" onPress={()=>router.push({pathname:item.bankEvent?'/modifica-banca':'/modifica-spesa',params:{id:item.id}})}/><Button title="Elimina spesa" secondary disabled={busy} onPress={()=>refundedCents(state,item.id)>0?Alert.alert('Spesa con rimborsi','Elimina prima i rimborsi collegati dalla sezione Rimborsi e prestiti.'):Alert.alert('Elimina spesa','Eliminare definitivamente questa spesa? Il bilancio sarÃ  aggiornato.',[{text:'Annulla',style:'cancel'},{text:'Elimina',style:'destructive',onPress:()=>{void run(s=>item.bankEvent?s.deleteBankMovement(item.id):s.deleteExpense(item.id)).then(()=>router.back()).catch(()=>Alert.alert('Eliminazione non completata','La spesa non Ã¨ stata eliminata. Riprova.'));}}])}/></Page>;
}
