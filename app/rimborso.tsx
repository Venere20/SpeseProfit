import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRuntime } from '../src/ui/context';
import { RefundForm } from '../src/ui/CreditForms';
import { EmptyState, Page } from '../src/ui/components';
import { isRefund } from '../src/domain/ledger';
export default function RefundRoute() {
  const { id, expenseId } = useLocalSearchParams<{ id?: string; expenseId?: string }>(); const { state } = useRuntime();
  const current = state?.transactions.find(t => t.id === id && isRefund(t));
  // Keep the form mounted until its successful deletion can navigate back.
  const [original] = useState(current); const item = current ?? original;
  if (id && !item) return <Page title="Rimborso"><EmptyState title="Rimborso non disponibile"/></Page>;
  return <RefundForm key={item?.id ?? expenseId ?? 'new'} item={item} expenseId={typeof expenseId === 'string' ? expenseId : undefined}/>;
}
