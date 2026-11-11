import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Button, Card, Page } from '../../src/ui/components';
import { useRuntime } from '../../src/ui/context';
import { Icon, IconName } from '../../src/ui/Icon';
import { styles } from '../../src/ui/theme';
import { clearNativeWidget } from '../../src/adapters/native/widget';
function Row({title,detail,icon,action}:{title:string;detail?:string;icon:IconName;action:()=>void}) {return <Pressable accessibilityRole="button" onPress={action} style={[styles.row,{minHeight:68}]}><Icon name={icon}/><View style={{flex:1,gap:3}}><Text style={styles.text}>{title}</Text>{detail&&<Text style={styles.muted}>{detail}</Text>}</View><Icon name="chevron" size={18}/></Pressable>;}
export default function Settings() {
  const {lock,run,busy}=useRuntime();
  return <Page title="Impostazioni"><Card><Text style={styles.subheading}>Sicurezza</Text><Row title="Cambia password" detail="Modifica la password dell’archivio protetto" icon="lock" action={()=>router.push('/sicurezza')}/><Row title="Durata della sessione" icon="clock" action={()=>router.push('/sessione')}/><Row title="Blocca applicazione" detail="Richiedi nuovamente lo sblocco" icon="lock" action={lock}/></Card>
    <Card><Text style={styles.subheading}>Gestione del denaro</Text><Row title="Automazioni Fineco" icon="wallet" action={()=>router.push('/automazioni')}/><Row title="Rimborsi e prestiti" icon="wallet" action={()=>router.push('/rimborsi-prestiti')}/></Card>
    <Card><Text style={styles.subheading}>Personalizzazione</Text><Row title="Personalizza widget" detail="Configura le tre scorciatoie rapide" icon="settings" action={()=>router.push('/widget')}/><Row title="Spese frequenti" icon="coffee" action={()=>router.push('/rapido')}/><Row title="Categorie e regole" icon="basket" action={()=>router.push('/categorie')}/><Row title="Promemoria serale" icon="clock" action={()=>router.push('/promemoria')}/></Card>
    <Card><Text style={styles.subheading}>Informazioni</Text><Row title="Informazioni sull'app" detail={`SpeseProfit · ${Constants.expoConfig?.version??'0.1.0'}`} icon="wallet" action={()=>Alert.alert('SpeseProfit',`Versione ${Constants.expoConfig?.version??'0.1.0'}\nArchivio personale locale. Nessun collegamento bancario.`)}/></Card>
    <Button title="Cancella storico dell'archivio" secondary disabled={busy} onPress={()=>Alert.alert('Cancella storico','Elimina definitivamente incassi, spese, categorie, modelli, preferenze e richieste in attesa. La password rimane attiva. Nessun recupero disponibile.',[{text:'Annulla',style:'cancel'},{text:'Cancella definitivamente',style:'destructive',onPress:()=>{void run(s=>s.reset()).then(async()=>{await clearNativeWidget();lock();}).catch(()=>Alert.alert('Cancellazione non completata','Riapri l’app e verifica lo stato prima di riprovare.'));}}])}/>
  </Page>;
}
