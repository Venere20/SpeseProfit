import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Button, Card, Choice, Field, Page } from './components';
import { useRuntime } from './context';
import { styles } from './theme';
export function LockScreen() {
  const {loading,busy,error,openVault,protectedStatus}=useRuntime();const [value,setValue]=useState('');const [confirm,setConfirm]=useState('');const [accepted,setAccepted]=useState(false);const [show,setShow]=useState(false);const [problem,setProblem]=useState('');
  const creating=protectedStatus==='missing';const available=creating||protectedStatus==='ready';
  const access=async()=>{const password=value;setValue('');setConfirm('');setProblem('');try{if(creating&&password.normalize('NFC')!==confirm.normalize('NFC'))throw new Error('Le password non coincidono.');await openVault(password,creating);}catch(e){setProblem((e as Error).message);}};
  return <Page standalone title={creating?'Proteggi SpeseProfit':'Bentornato'}><View style={{alignItems:'center',paddingVertical:12}}><Image source={require('../../assets/branding/icon.png')} accessible accessibilityLabel="Logo SpeseProfit" style={{width:120,height:120,borderRadius:24}}/></View>
    <Card>{loading?<Text style={styles.text}>Verifica archivio…</Text>:<Text style={styles.text}>{creating?'Imposta una password per accedere ai tuoi dati finanziari.':'Inserisci la password per accedere ai tuoi dati.'}</Text>}
      {!loading&&protectedStatus==='unavailable'&&<Text style={styles.error}>Installa la build Android dedicata. L’archivio protetto non è disponibile in Expo Go o nel browser.</Text>}
      {protectedStatus==='damaged'&&<Text style={styles.error}>Archivio incompleto o chiave non disponibile. I dati non vengono cancellati.</Text>}
      {!loading&&available&&<><Field label={creating?'Nuova password':'Password'} value={value} onChangeText={setValue} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} editable={!busy}/>{creating&&<Field label="Conferma password" value={confirm} onChangeText={setConfirm} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} editable={!busy}/>}<Choice label={show?'Nascondi password':'Mostra password'} selected={show} disabled={busy} onPress={()=>setShow(!show)}/>
        {creating&&<><Text style={styles.muted}>Da 16 a 128 caratteri. Nessun recupero password, backup o esportazione. Perdita del telefono o della password può rendere i dati definitivamente inaccessibili.</Text><Choice label="Ho compreso: nessun recupero" selected={accepted} onPress={()=>setAccepted(!accepted)} disabled={busy}/></>}
        {!!(problem||error)&&<Text accessibilityRole="alert" style={styles.error}>{problem||error}</Text>}<Button title={creating?'Crea archivio protetto':'Sblocca'} busy={busy} disabled={!value||!!error||(creating&&!accepted)} onPress={()=>{void access();}}/>
      </>}
    </Card>
  </Page>;
}
