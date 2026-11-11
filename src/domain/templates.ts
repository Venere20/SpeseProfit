import { Category, ExpenseTemplate, LedgerState } from './model';
import { assertCents, romeDate } from './ledger';

export type TemplateInput = Omit<ExpenseTemplate, 'id'>;
export function validateTemplate(input: TemplateInput, categories: Category[]): TemplateInput {
  assertCents(input.cents, false);
  if (typeof input.description !== 'string' || !input.description.trim() || input.description.trim().length > 200) throw new Error('Inserisci una descrizione di massimo 200 caratteri.');
  if (!['cash', 'card'].includes(input.origin)) throw new Error('Metodo di pagamento non valido.');
  if (typeof input.categoryId !== 'string' || (input.categoryId !== '' && !categories.some(c => c.id === input.categoryId && c.kind === 'expense'))) throw new Error('Categoria del modello non valida.');
  return { description: input.description.trim(), cents: input.cents, categoryId: input.categoryId, origin: input.origin };
}
export function validateTemplates(raw: unknown, categories: Category[]): ExpenseTemplate[] {
  if (!Array.isArray(raw)) throw new Error('Formato dei modelli non supportato.');
  const ids = new Set<string>();
  return raw.map(row => {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id)) throw new Error('Modello non valido o duplicato.');
    ids.add(row.id);
    return { id: row.id, ...validateTemplate(row, categories) };
  });
}
export function templateDraft(state: LedgerState, id: string, now = new Date()) {
  const template = state.expenseTemplates?.find(t => t.id === id);
  if (!template) throw new Error('Modello non disponibile. Scegline un altro o inserisci la spesa manualmente.');
  return { ...validateTemplate(template, state.categories), date: romeDate(now) };
}
