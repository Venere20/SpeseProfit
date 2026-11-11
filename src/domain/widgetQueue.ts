import { ExpenseTemplate, LedgerState } from './model';
import { romeDate, validateDate } from './ledger';
import { validateTemplate } from './templates';
export interface WidgetExpense { id: string; date: string; occurredAt: number; template: ExpenseTemplate }
export function validateWidgetSlots(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length !== 3 || raw.some(v => typeof v !== 'string' || v.length > 200)) throw new Error('Configurazione widget non valida.');
  const chosen = raw.filter(Boolean);
  if (new Set(chosen).size !== chosen.length) throw new Error('Scegli tre modelli diversi.');
  return [...raw];
}
export function validateImportedIds(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.some(id => typeof id !== 'string' || !/^widget:[a-f0-9-]{36}$/.test(id)) || new Set(raw).size !== raw.length) throw new Error('Registro richieste widget non valido.');
  return [...raw];
}
export function validateWidgetExpense(raw: unknown, state: LedgerState): WidgetExpense {
  if (!raw || typeof raw !== 'object') throw new Error('Richiesta widget non valida.');
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !/^widget:[a-f0-9-]{36}$/.test(r.id) || typeof r.date !== 'string' || !Number.isSafeInteger(r.occurredAt) || (r.occurredAt as number) < 0 || !r.template || typeof r.template !== 'object') throw new Error('Richiesta widget non valida.');
  validateDate(r.date);
  if (romeDate(new Date(r.occurredAt as number)) !== r.date) throw new Error('Data della richiesta widget non coerente.');
  const t = r.template as ExpenseTemplate;
  if (typeof t.id !== 'string' || !t.id) throw new Error('Modello widget non valido.');
  return { id: r.id, date: r.date, occurredAt: r.occurredAt as number, template: { id: t.id, ...validateTemplate(t, state.categories) } };
}
