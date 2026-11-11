import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRuntime } from '../src/ui/context';
import { RepaymentForm } from '../src/ui/CreditForms';
import { EmptyState, Page } from '../src/ui/components';
export default function RepaymentRoute() {
  const { loanId, id } = useLocalSearchParams<{ loanId?: string; id?: string }>(); const { state } = useRuntime(); const loan = state?.loans?.find(l => l.id === loanId); const current = loan?.repayments.find(r => r.id === id);
  // Keep the form mounted until its successful deletion can navigate back.
  const [original] = useState(current); const item = current ?? original;
  if (!loan || (id && !item)) return <Page title="Restituzione"><EmptyState title="Prestito o restituzione non disponibile"/></Page>;
  return <RepaymentForm key={item?.id ?? loan.id} loan={loan} item={item}/>;
}
