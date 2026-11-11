import { useLocalSearchParams } from 'expo-router';
import { useRuntime } from '../src/ui/context';
import { ExpenseEditor } from '../src/ui/ExpenseEditor';
import { EmptyState, Page } from '../src/ui/components';
export default function EditExpense() { const {id}=useLocalSearchParams<{id:string}>();const {state}=useRuntime();const item=state?.transactions.find(t=>t.id===id&&t.cents<0);if(!item)return <Page title="Modifica spesa"><EmptyState title="Spesa non disponibile"/></Page>;return <ExpenseEditor key={item.id} item={item}/>; }
