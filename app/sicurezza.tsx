import { useState } from 'react';
import { Text, ToastAndroid } from 'react-native';
import { Button, Card, Choice, Field, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { passwordProblem, passwordChangeMessage } from '../src/domain/passwordPolicy';
import { styles } from '../src/ui/theme';
export default function Security() {
  const {changePassword,lock,busy}=useRuntime();
  const [current,setCurrent]=useState('');const [next,setNext]=useState('');const [confirm,setConfirm]=useState('');const [error,setError]=useState('');const [show,setShow]=useState(false);const [changing,setChanging]=useState(false);
  const problem=next?passwordProblem(next):null;const mismatch=confirm&&next.normalize('NFC')!==confirm.normalize('NFC')?'Le nuove password non coincidono.':'';
  return <Page title="Cambia password"><Card><Text style={styles.subheading}>Password dell’archivio</Text>
    <Field label="Password attuale" value={current} onChangeText={setCurrent} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} editable={!changing}/>
    <Field label="Nuova password" value={next} onChangeText={setNext} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} editable={!changing} error={problem??undefined}/>
    <Field label="Conferma nuova password" value={confirm} onChangeText={setConfirm} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} editable={!changing} error={mismatch||undefined}/>
    <Choice label={show?'Nascondi password':'Mostra password'} selected={show} disabled={changing} onPress={()=>setShow(!show)}/>
    {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Button title="Aggiorna password" busy={changing} disabled={!current||!next||!confirm||!!problem||!!mismatch||busy} onPress={()=>{const previous=current;const replacement=next;setCurrent('');setNext('');setConfirm('');setChanging(true);setError('');void changePassword(previous,replacement).then(()=>{ToastAndroid.show('Password aggiornata',ToastAndroid.SHORT);lock();}).catch(e=>setError(passwordChangeMessage(e))).finally(()=>setChanging(false));}}/>
  </Card></Page>;
}
