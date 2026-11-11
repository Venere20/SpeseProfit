import { LedgerState, Transaction, WeeklySummary, WidgetSnapshot, WidgetView } from './model';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export function validateDate(value: string): string {
  if (!datePattern.test(value)) throw new Error('Usa una data nel formato AAAA-MM-GG.');
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('La data non è valida.');
  return value;
}
export function romeDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${validateDate(date)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function weekOf(date: string): string {
  const day = new Date(`${validateDate(date)}T12:00:00Z`).getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
}
export function assertCents(cents: number, allowZero = true): void {
  if (!Number.isSafeInteger(cents) || cents < (allowZero ? 0 : 1) || cents > 100_000_000_000) throw new Error('Importo non valido.');
}
export function parseMoney(raw: string): number {
  const value = raw.trim();
  if (!/^\d{1,9}([,.]\d{1,2})?$/.test(value)) throw new Error('Inserisci un importo, ad esempio 800,50 (senza separatori delle migliaia).');
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  assertCents(cents);
  return cents;
}
export const money = (cents: number): string => `${cents < 0 ? '−' : ''}€ ${new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(cents) / 100)}`;
export const normalize = (s: string): string => s.normalize('NFKC').toLocaleLowerCase('it-IT').trim();
export function categoryFor(state: LedgerState, description: string, cents: number): string {
  const text = normalize(description);
  const custom = [...state.rules].reverse().find(rule => text.includes(rule.match) && state.categories.some(c => c.id === rule.categoryId && c.kind === (cents < 0 ? 'expense' : 'income')));
  if (custom) return custom.categoryId;
  if (cents >= 0) return /rimborso|storno/.test(text) ? 'refund' : 'income';
  const defaults: [RegExp, string][] = [
    [/supermercato|esselunga|coop|conad|lidl|alimentari/, 'food'],
    [/ristorante|pizzeria|caffe|caffè|bar\b/, 'dining'],
    [/benzina|carburante|trenitalia|metro|autostrada/, 'transport'],
    [/bolletta|energia|affitto|utenza/, 'home'],
    [/farmacia|medico|dentista/, 'health'], [/cinema|teatro|palestra/, 'leisure'],
    [/amazon|negozio|abbigliamento/, 'shopping'],
  ];
  return defaults.find(([pattern]) => pattern.test(text))?.[1] ?? 'uncategorized';
}
export function isRefund(t: Transaction): boolean { return t.cents > 0 && (t.kind === 'refund' || t.categoryId === 'refund'); }
export function summary(state: LedgerState, week: string): WeeklySummary {
  if (weekOf(week) !== week) throw new Error('La settimana deve iniziare di lunedì.');
  const hasCashIncome = Object.hasOwn(state.cashIncome, week);
  const cashIncome = state.cashIncome[week] ?? 0;
  const totals = new Map<string, number>();
  let income = cashIncome;
  let expenses = 0; let refunds = 0;
  for (const t of state.transactions) {
    if (weekOf(t.date) !== week || t.classification !== 'included') continue;
    if (isRefund(t)) refunds += t.cents;
    else if (t.cents >= 0) { if (!(t.bankEvent && hasCashIncome)) income += t.cents; }
    else {
      expenses -= t.cents;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) - t.cents);
    }
  }
  const balance = income + refunds - expenses;
  return { weekStart: week, hasCashIncome, cashIncome, income, expenses, refunds, balance,
    balanceState: !hasCashIncome ? 'incomplete' : balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'even',
    categoryExpenses: [...totals].map(([categoryId, cents]) => ({ categoryId, cents })).sort((a, b) => b.cents - a.cents),
  };
}
export function widgetSnapshot(state: LedgerState, now = new Date()): WidgetSnapshot {
  const week = weekOf(romeDate(now));
  return { weekStart: week, balanceState: summary({ ...state, transactions: state.transactions.filter(t => t.date <= romeDate(now)) }, week).balanceState,
    calculatedAt: now.toISOString() };
}
export function widgetView(snapshot: WidgetSnapshot, now = new Date()): WidgetView {
  const calculated = Date.parse(snapshot.calculatedAt);
  const fresh = Number.isFinite(calculated) && calculated <= now.getTime() &&
    weekOf(romeDate(new Date(calculated))) === snapshot.weekStart &&
    romeDate(new Date(calculated)) === romeDate(now);
  if (snapshot.weekStart !== weekOf(romeDate(now)) || !fresh) return { state: 'stale', label: 'Da aggiornare', color: '#B9C4CD' };
  const labels = { positive: 'Positivo', negative: 'Negativo', even: 'In pareggio', incomplete: 'Da completare' };
  const colors = { positive: '#A7D5BF', negative: '#E8A7A7', even: '#CDBB98', incomplete: '#EACB8C' };
  return { state: snapshot.balanceState, label: labels[snapshot.balanceState], color: colors[snapshot.balanceState] };
}
export { passwordProblem } from './passwordPolicy';
