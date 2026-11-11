import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Choice, Choices, Page } from '../src/ui/components';
import { useRuntime } from '../src/ui/context';
import { SESSION_OPTIONS } from '../src/domain/session';
import { styles } from '../src/ui/theme';
export default function SessionSettings() {
  const {sessionTimeout,sessionSettingsAvailable,configureSessionTimeout,busy,lock}=useRuntime();
  const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  return <Page title="Durata della sessione"><Card><Text style={styles.subheading}>Quando richiedere la password</Text>
    <Choices>{SESSION_OPTIONS.map(option=><Choice key={option.milliseconds} label={option.label} selected={sessionTimeout===option.milliseconds} disabled={!sessionSettingsAvailable||saving||busy} onPress={()=>{setSaving(true);setError('');void configureSessionTimeout(option.milliseconds).catch(e=>setError(e.message)).finally(()=>setSaving(false));}}/>)}</Choices>
    {!sessionSettingsAvailable&&<Text style={styles.error}>Aggiorna l’app per cambiare questa impostazione.</Text>}{!!error&&<Text style={styles.error}>{error}</Text>}
  </Card><Button title="Blocca applicazione" secondary onPress={lock}/></Page>;
}
