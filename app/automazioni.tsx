import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useRuntime } from '../src/ui/context';
import { Button,Card,Field,Page } from '../src/ui/components';
import { bankAvailable,bankStatus,connectBankGmail,requestBankSmsPermission } from '../src/adapters/native/bank';
import { money } from '../src/domain/ledger';
import { styles } from '../src/ui/theme';
export default function Automations(){
 const {state,run,busy,syncFineco}=useRuntime();const [sender,setSender]=useState(state?.bankAutomation?.smsSender??'');const [owner,setOwner]=useState(state?.bankAutomation?.owner??'');const [error,setError]=useState('');const [status,setStatus]=useState<Awaited<ReturnType<typeof bankStatus>>|null>(null);
 const refresh=()=>{if(bankAvailable)void bankStatus().then(setStatus).catch(()=>setError('Stato Fineco non disponibile.'));};
 useEffect(()=>{refresh();const t=setInterval(refresh,5000);return()=>clearInterval(t);},[]);
 const act=(fn:()=>Promise<unknown>)=>{setError('');void fn().then(refresh).catch(e=>setError((e as Error).message));};
 if(!state)return null;
 return <Page title="Automazioni Fineco"><Card><Text style={styles.text}>Nuovi SMS e bonifici Gmail vengono conservati cifrati e registrati allo sblocco. Gmail controlla periodicamente: Android può ritardare la sincronizzazione.</Text>
 <Field label="Mittente SMS esatto mostrato dal telefono" value={sender} onChangeText={setSender} maxLength={80}/><Field label="Nome e cognome intestatario" value={owner} onChangeText={setOwner} maxLength={100}/>
 <Button title={state.bankAutomation?'Salva configurazione':'Attiva dai nuovi messaggi'} busy={busy} disabled={!bankAvailable||!sender.trim()||!owner.trim()} onPress={()=>act(()=>run(s=>s.configureBankAutomation({activatedAt:state.bankAutomation?.activatedAt??Date.now(),smsSender:sender.trim(),owner:owner.trim()})))}/>
 {!bankAvailable&&<Text style={styles.error}>Serve la nuova build Android dedicata.</Text>}
 {state.bankAutomation&&<><Text style={styles.text}>SMS: {status?.smsGranted?'permesso concesso':'funzione inattiva: autorizzazione necessaria'}</Text><Button title="Autorizza nuovi SMS" secondary onPress={()=>act(requestBankSmsPermission)}/><Text style={styles.text}>Gmail: {status?.gmail||'non collegato'}</Text><Button title="Collega Gmail in sola lettura" secondary onPress={()=>act(connectBankGmail)}/><Button title="Sincronizza ora" busy={busy} onPress={()=>act(syncFineco)}/><Text style={styles.muted}>Ultimo controllo riuscito: {status?.lastSync?new Date(status.lastSync).toLocaleString('it-IT'):'non disponibile'} · In coda: {status?.pending??0}</Text></>}
 {!!(error||status?.error)&&<Text style={styles.error}>{error||status?.error}</Text>}</Card>
 {!!state.bankIncomeReviewWeeks?.length&&<Card><Text style={styles.text}>Verifica i totali settimanali: sono arrivati nuovi bonifici. I totali manuali restano invariati.</Text></Card>}
 {(state.bankReview??[]).map(item=>{const id=item.message.source+':'+item.message.id;const e=item.event;const negative=e&&(e.status==='rejected'||e.status==='cancelled');return <Card key={id}><Text style={styles.subheading}>Da verificare</Text><Text style={styles.text}>{item.reason}</Text><Text style={styles.text}>{e?e.counterparty+' · '+money(e.cents):'Formato non riconosciuto: consulta il messaggio originale.'}</Text>
 {e&&!negative&&<><Button title="Conferma nel bilancio" disabled={busy} onPress={()=>act(()=>run(s=>s.resolveBankReview(id,'included')))}/><Button title="È un giroconto" secondary disabled={busy} onPress={()=>act(()=>run(s=>s.resolveBankReview(id,'transfer')))}/></>}
 {e&&!negative&&state.transactions.filter(t=>t.bankEvent?.status==='submitted'&&t.cents===e.cents).map(t=><Button key={t.id} title={'Conferma il provvisorio '+t.description+' · '+t.date} secondary disabled={busy} onPress={()=>act(()=>run(s=>s.resolveBankReview(id,'included',t.id)))}/>)}
 {negative&&state.transactions.filter(t=>t.bankEvent&&t.cents<0&&Math.abs(t.cents)===Math.abs(e.cents)).slice(0,20).map(t=><Button key={t.id} title={'Abbina a '+t.description+' · '+t.date} secondary disabled={busy} onPress={()=>act(()=>run(s=>s.resolveBankReview(id,'excluded',t.id)))}/>)}
 <Button title="Ignora avviso" secondary disabled={busy} onPress={()=>act(()=>run(s=>s.dismissBankReview(id)))}/></Card>;})}</Page>;
}
