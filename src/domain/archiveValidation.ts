import { assertCents, validateDate } from './ledger';
import { Category, CategoryRule, Transaction } from './model';
import { validateMonday } from './progress';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Record dell’archivio non valido.');
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}
function uniqueId(value: unknown, seen: Set<string>): string {
  if (!text(value, 512) || seen.has(value)) throw new Error('Identificativo dell’archivio non valido o duplicato.');
  seen.add(value); return value;
}
export function validateCategories(raw: unknown[]): Category[] {
  const ids = new Set<string>();
  return raw.map(value => {
    const row = record(value); uniqueId(row.id, ids);
    if (!text(row.name, 40) || !['expense', 'income'].includes(row.kind as string)) throw new Error('Categoria dell’archivio non valida.');
    return { ...row } as unknown as Category;
  });
}
export function validateRules(raw: unknown[], categories: Category[]): CategoryRule[] {
  const ids = new Set<string>();
  return raw.map(value => {
    const row = record(value); uniqueId(row.id, ids);
    if (!text(row.match, 200) || typeof row.categoryId !== 'string' || !categories.some(c => c.id === row.categoryId)) throw new Error('Regola dell’archivio non valida.');
    return { ...row } as unknown as CategoryRule;
  });
}
export function validateCashIncome(raw: unknown): Record<string, number> {
  const source = record(raw);
  const result: Record<string, number> = {};
  for (const [week, cents] of Object.entries(source)) {
    validateMonday(week);
    if (typeof cents !== 'number') throw new Error('Incasso dell’archivio non numerico.');
    assertCents(cents); result[week] = cents;
  }
  return result;
}
export function validateTransactions(raw: unknown[], categories: Category[]): Transaction[] {
  const ids = new Set<string>();
  return raw.map(value => {
    const row = record(value); uniqueId(row.id, ids);
    if (typeof row.date !== 'string') throw new Error('Data del movimento non valida.');
    validateDate(row.date);
    if (typeof row.cents !== 'number') throw new Error('Importo del movimento non numerico.');
    assertCents(Math.abs(row.cents));
    if (!['cash', 'card', 'account'].includes(row.origin as string) || !text(row.description, 200) ||
        !['included', 'transfer', 'excluded'].includes(row.classification as string) || typeof row.manualCategory !== 'boolean' ||
        typeof row.categoryId !== 'string' || !categories.some(c => c.id === row.categoryId && c.kind === ((row.cents as number) < 0 ? 'expense' : 'income'))) {
      throw new Error('Campi del movimento non validi.');
    }
    return { ...row } as unknown as Transaction;
  });
}
