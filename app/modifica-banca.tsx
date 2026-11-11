import {usePreventRemove} from 'expo-router/react-navigation';
import {useEffect,useRef,useState} from 'react';
import {router,useLocalSearchParams,useNavigation} from 'expo-router';
import {Alert,Text} from 'react-native';
import {useRuntime} from '../src/ui/context';
import {Button,Card,Choice,Choices,Field,Page} from '../src/ui/components';
import {parseMoney} from '../src/domain/ledger';
import {styles} from '../src/ui/theme';
export default function EditBank(){
 const {id}=useLocalSearchParams<{id:string}>();const {state,run,busy}=useRuntime();const t=state?.transactions.find(t=>t.id===id&&t.bankEvent);
 const navigation=useNavigation();const saving=useRef(false);const [saved,setSaved]=useState(false);const [initial]=useState(()=>({amount:t?String(Math.abs(t.cents)/100).replace('.',','):'',description:t?.description??'',classification:t?.classification??'included'}));
 const [amount,setAmount]=useState(t?String(Math.abs(t.cents)/100).replace('.',','):'');const [description,setDescription]=useState(t?.description??'');const [classification,setClassification]=useState(t?.classification??'included');const [error,setError]=useState('');
 const dirty=amount!==initial.amount||description!==initial.description||classification!==initial.classification;
 usePreventRemove(!saved&&(dirty||busy),({data})=>{
   const wait=()=>Alert.alert('Salvataggio in corso','Attendi il completamento.');
   if(saving.current){wait();return;}
   Alert.alert('Uscire senza salvare?','Le modifiche non salvate saranno perse.',[{text:'Continua',style:'cancel'},{text:'Esci',style:'destructive',onPress:()=>{if(saving.current){wait();return;}navigation.dispatch(data.action);}}]);
 });
 useEffect(()=>{if(saved)router.back();},[saved]);
 return <Page title="Modifica movimento Fineco"><Card>{t?<><Field label="Importo (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy}/><Field label="Descrizione" value={description} onChangeText={setDescription} maxLength={200} editable={!busy}/><Choices>{(['included','transfer','excluded'] as const).map(c=><Choice key={c} label={{included:'Incluso',transfer:'Giroconto',excluded:'Escluso'}[c]} selected={classification===c} disabled={busy} onPress={()=>setClassification(c)}/>)}</Choices><Text style={styles.muted}>La provenienza originale resta conservata.</Text><Button title="Salva modifiche" busy={busy} onPress={()=>{if(saving.current||busy)return;try{const cents=parseMoney(amount)*Math.sign(t.cents);saving.current=true;void run(s=>s.updateBankMovement(t.id,cents,description,classification)).then(()=>setSaved(true)).catch(e=>{saving.current=false;setError(e.message);});}catch(e){setError((e as Error).message);}}}/></>:<Text style={styles.text}>Movimento non disponibile.</Text>}{!!error&&<Text style={styles.error}>{error}</Text>}</Card></Page>;
}
