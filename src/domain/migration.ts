import { validateBankData } from './fineco';
import { validateLoans, validateRefundLinks } from './credits';
import { validateShortcuts } from './shortcuts';
import { validateImportedIds, validateWidgetSlots } from './widgetQueue';
import { validateCompletedDays, validateMonday, validateReminder } from './progress';
import { validateTemplates } from './templates';
import { LedgerState } from './model';
import { validateCashIncome, validateCategories, validateRules, validateTransactions } from './archiveValidation';

// Version 1 bank entries were exclusively simulated. They never enter real totals.
// Keep them inert inside the encrypted archive so migration does not destroy records.
export function loadLedger(raw: unknown): { state: LedgerState; migrated: boolean } {
  if (!raw || typeof raw !== 'object') throw new Error('Formato dell’archivio non supportato.');
  const data = raw as Record<string, unknown>;
  if (![1, 2, 3].includes(data.version as number) || !Array.isArray(data.transactions) ||
      !Array.isArray(data.categories) || !Array.isArray(data.rules) ||
      !data.cashIncome || typeof data.cashIncome !== 'object' || Array.isArray(data.cashIncome) ||
      (data.retiredSimulation !== undefined && !Array.isArray(data.retiredSimulation))) {
    throw new Error('Formato dell’archivio non supportato.');
  }
  for (const row of data.transactions) {
    if (!row || typeof row !== 'object' || !['cash', 'card', ...(data.version===3?['account']:[]), ...(data.version === 1 ? ['bank'] : [])].includes(row.origin)) {
      throw new Error('Movimento dell’archivio non supportato.');
    }
  }
  const retired = [...(data.retiredSimulation as unknown[] ?? []),
    ...data.transactions.filter(t => t.origin === 'bank')];
  const categories = validateCategories(data.categories);
  const rules = validateRules(data.rules, categories);
  const cashIncome = validateCashIncome(data.cashIncome);
  const transactions = validateTransactions(data.transactions.filter(t => t.origin !== 'bank'), categories);
  const state: LedgerState = { version: 3, ...validateBankData(data),
    transactions, categories, rules, cashIncome,
    ...(data.loans !== undefined ? { loans: validateLoans(data.loans) } : {}),
    ...(retired.length ? { retiredSimulation: retired } : {}),
    ...(data.widgetShortcuts !== undefined ? { widgetShortcuts: validateShortcuts(data.widgetShortcuts, categories) } : {}),
    ...(data.widgetSlots !== undefined ? { widgetSlots: validateWidgetSlots(data.widgetSlots) } : {}),
    ...(data.importedWidgetIds !== undefined ? { importedWidgetIds: validateImportedIds(data.importedWidgetIds) } : {}),
    ...(data.accumulationStart !== undefined ? { accumulationStart: validateMonday(data.accumulationStart as string) } : {}),
    ...(data.dailyReminder !== undefined ? { dailyReminder: validateReminder(data.dailyReminder) } : {}),
    ...(data.completedDays !== undefined ? { completedDays: validateCompletedDays(data.completedDays) } : {}),
    ...(data.expenseTemplates !== undefined ? { expenseTemplates: validateTemplates(data.expenseTemplates, categories) } : {}) };
  if (state.widgetSlots?.some(id => id && !state.expenseTemplates?.some(t => t.id === id))) throw new Error('Modello widget dell’archivio non disponibile.');
  validateRefundLinks(state);
  return { state, migrated: data.version !== 3 };
}
