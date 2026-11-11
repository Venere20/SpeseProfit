import { assertCents, isRefund, romeDate, validateDate } from './ledger';
import { LedgerState, Loan, LoanRepayment } from './model';
export type LoanInput = Omit<Loan, 'id' | 'repayments'>;
export type RepaymentInput = Omit<LoanRepayment, 'id'>;
export interface RefundInput { date: string; cents: number; description: string; origin: 'card' | 'cash' | 'account'; refundFor?: string }
function payment(origin: unknown) { if (origin !== 'card' && origin !== 'cash' && origin !== 'account') throw new Error('Metodo di pagamento non valido.'); }
function cleanText(text: unknown, max: number, required = false): string {
  if (typeof text !== 'string' || text.trim().length > max || (required && !text.trim())) throw new Error(`Inserisci un testo ${required ? 'non vuoto, ' : ''}di massimo ${max} caratteri.`);
  return text.trim();
}
export function cleanLoan(input: LoanInput): LoanInput {
  if (!['lent', 'borrowed'].includes(input.direction)) throw new Error('Tipo di prestito non valido.');
  assertCents(input.cents, false); validateDate(input.date); payment(input.origin);
  if (input.dueDate !== undefined && (validateDate(input.dueDate) < input.date)) throw new Error('La scadenza non può precedere il prestito.');
  return { direction: input.direction, person: cleanText(input.person, 80, true), date: input.date, cents: input.cents,
    origin: input.origin, note: cleanText(input.note, 200), ...(input.dueDate ? { dueDate: input.dueDate } : {}) };
}
export function cleanRepayment(input: RepaymentInput): RepaymentInput {
  assertCents(input.cents, false); validateDate(input.date); payment(input.origin);
  return { date: input.date, cents: input.cents, origin: input.origin, note: cleanText(input.note, 200) };
}
export function loanRepaid(loan: Loan, through?: string) { return loan.repayments.filter(r => !through || r.date <= through).reduce((sum, r) => sum + r.cents, 0); }
export function loanRemaining(loan: Loan, through?: string) { return loan.cents - loanRepaid(loan, through); }
export function validateLoans(raw: unknown): Loan[] {
  if (!Array.isArray(raw)) throw new Error('Elenco prestiti non valido.');
  const ids = new Set<string>();
  return raw.map(value => {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id || ids.has(value.id) || !Array.isArray(value.repayments)) throw new Error('Prestito non valido o duplicato.');
    ids.add(value.id); const seen = new Set<string>(); const input = cleanLoan(value);
    const repayments: LoanRepayment[] = value.repayments.map((r: LoanRepayment) => {
      if (!r || typeof r.id !== 'string' || !r.id || seen.has(r.id)) throw new Error('Restituzione non valida o duplicata.');
      seen.add(r.id); const clean = cleanRepayment(r);
      if (clean.date < input.date) throw new Error('La restituzione non può precedere il prestito.');
      return { id: r.id, ...clean };
    });
    const loan = { id: value.id, ...input, repayments };
    if (!Number.isSafeInteger(loanRepaid(loan)) || loanRemaining(loan) < 0) throw new Error('Le restituzioni superano il prestito.');
    return loan;
  });
}
export function refundedCents(state: LedgerState, expenseId: string, except?: string) {
  return state.transactions.filter(t => isRefund(t) && t.refundFor === expenseId && t.id !== except).reduce((sum, t) => sum + t.cents, 0);
}
export function cleanRefund(state: LedgerState, input: RefundInput, except?: string): RefundInput {
  assertCents(input.cents, false); validateDate(input.date); payment(input.origin);
  if (input.refundFor !== undefined) {
    if (typeof input.refundFor !== 'string') throw new Error('Spesa collegata non valida.');
    const expense = state.transactions.find(t => t.id === input.refundFor && t.cents < 0 && t.classification === 'included');
    if (!expense) throw new Error('Seleziona una spesa inclusa nel bilancio.');
    assertCents(-expense.cents, false);
    if (input.date < expense.date) throw new Error('Il rimborso non può precedere la spesa.');
    if (refundedCents(state, expense.id, except) + input.cents > -expense.cents) throw new Error('Il rimborso supera la parte ancora da rimborsare.');
  }
  return { date: input.date, cents: input.cents, origin: input.origin, description: cleanText(input.description, 200, true), ...(input.refundFor !== undefined ? { refundFor: input.refundFor } : {}) };
}
export function validateRefundLinks(state: LedgerState) {
  for (const t of state.transactions) {
    if (t.kind !== undefined && t.kind !== 'refund') throw new Error('Tipo di movimento non valido.');
    if (t.refundFor !== undefined && t.kind !== 'refund') throw new Error('Collegamento rimborso non valido.');
    if (t.kind === 'refund') {
      if (typeof t.id !== 'string' || !t.id || state.transactions.filter(x => x.id === t.id).length !== 1) throw new Error('Identificativo rimborso non valido o duplicato.');
      if (t.categoryId !== 'refund' || t.classification !== 'included') throw new Error('Rimborso dell’archivio non valido.');
      cleanRefund(state, t, t.id);
    }
  }
}
export function creditOverview(state: LedgerState, today = romeDate()) {
  const loans = (state.loans ?? []).filter(l => l.date <= today);
  const open = loans.filter(l => loanRemaining(l, today) > 0);
  return { receivable: open.filter(l => l.direction === 'lent').reduce((s, l) => s + loanRemaining(l, today), 0),
    payable: open.filter(l => l.direction === 'borrowed').reduce((s, l) => s + loanRemaining(l, today), 0),
    overdue: open.filter(l => l.dueDate && l.dueDate < today).length, open: open.length };
}
