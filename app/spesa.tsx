import { router, useLocalSearchParams } from 'expo-router';
import { ExpenseEditor } from '../src/ui/ExpenseEditor';
import { useRuntime } from '../src/ui/context';
import { templateDraft } from '../src/domain/templates';
import { ExpenseTemplate } from '../src/domain/model';
import { Button, EmptyState, Page } from '../src/ui/components';
export default function ExpenseRoute() {
  const {template,slot}=useLocalSearchParams<{template?:string;slot?:string}>();const {state}=useRuntime();if(!state)return null;
  let draft:Partial<ExpenseTemplate>|undefined;
  try{if(template)draft=templateDraft(state,template);if(slot!==undefined){if(!/^[0-2]$/.test(slot))throw new Error();const shortcut=state.widgetShortcuts?.[Number(slot)];if(!shortcut)throw new Error();draft={categoryId:shortcut.categoryId,cents:shortcut.cents,description:shortcut.description,origin:shortcut.origin};}}
  catch{return <Page title="Nuova spesa"><EmptyState title="Scorciatoia non disponibile"/><Button title="Inserisci una spesa manuale" onPress={()=>router.replace('/spesa')}/></Page>;}
  return <ExpenseEditor key={template??slot??'manual'} draft={draft}/>;
}
