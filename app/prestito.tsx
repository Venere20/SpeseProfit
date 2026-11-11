import { useLocalSearchParams } from 'expo-router';
import { useRuntime } from '../src/ui/context';
import { LoanForm } from '../src/ui/CreditForms';
import { EmptyState, Page } from '../src/ui/components';
export default function LoanRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>(); const { state } = useRuntime(); const item = state?.loans?.find(l => l.id === id);
  if (id && !item) return <Page title="Prestito"><EmptyState title="Prestito non disponibile"/></Page>;
  return <LoanForm key={item?.id ?? 'new'} item={item}/>;
}
