import { validateDate, weekOf } from './ledger';
import { LedgerState, Transaction } from './model';

export interface MovementFilters {
  query: string;
  category: string;
  origin: 'all' | Transaction['origin'];
  period: 'week' | 'all' | 'range';
  week: string;
  from: string;
  to: string;
}
const searchable = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it-IT');

export function searchMovements(state: LedgerState, filters: MovementFilters): Transaction[] {
  if (filters.period === 'range') {
    validateDate(filters.from); validateDate(filters.to);
    if (filters.from > filters.to) throw new Error('La data iniziale deve precedere o coincidere con quella finale.');
  }
  const words = searchable(filters.query).trim().split(/\s+/).filter(Boolean);
  const categories = new Map(state.categories.map(c => [c.id, c.name]));
  return state.transactions.filter(t => {
    if (filters.period === 'week' && weekOf(t.date) !== filters.week) return false;
    if (filters.period === 'range' && (t.date < filters.from || t.date > filters.to)) return false;
    if (filters.category !== 'all' && t.categoryId !== filters.category) return false;
    if (filters.origin !== 'all' && t.origin !== filters.origin) return false;
    const text = searchable(t.description + ' ' + (categories.get(t.categoryId) ?? ''));
    return words.every(word => text.includes(word));
  }).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
