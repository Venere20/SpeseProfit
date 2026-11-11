import type { BankAutomation, BankEvent, BankReview } from './fineco';
export type WeekKey = string;
export type BalanceState = 'positive' | 'negative' | 'even' | 'incomplete';
export type CategoryKind = 'expense' | 'income';
export interface Category { id: string; name: string; kind: CategoryKind }
export interface CategoryRule { id: string; match: string; categoryId: string }
export interface Transaction {
  id: string; origin: 'card' | 'cash' | 'account'; bankEvent?: BankEvent;
  date: string; cents: number; description: string; categoryId: string;
  classification: 'included' | 'transfer' | 'excluded'; manualCategory: boolean;
  kind?: 'refund'; refundFor?: string;
}
export interface ExpenseTemplate {
  id: string; description: string; cents: number; categoryId: string; origin: 'card' | 'cash';
}
export interface WidgetShortcut { type: 'category' | 'frequent'; label: string; categoryId: string; cents?: number; description: string; origin: 'card' | 'cash' }
export interface LoanRepayment { id: string; date: string; cents: number; origin: 'card' | 'cash' | 'account'; note: string }
export interface Loan { id: string; direction: 'lent' | 'borrowed'; person: string; date: string; cents: number;
  origin: 'card' | 'cash' | 'account'; note: string; dueDate?: string; repayments: LoanRepayment[] }
export interface LedgerState {
  version: 3; transactions: Transaction[]; cashIncome: Record<WeekKey, number>;
  categories: Category[]; rules: CategoryRule[];
  bankAutomation?: BankAutomation; importedBankIds?: string[]; bankReview?: BankReview[]; bankIncomeReviewWeeks?: string[];
  retiredSimulation?: unknown[];
  loans?: Loan[];
  expenseTemplates?: ExpenseTemplate[];
  widgetSlots?: string[];
  widgetShortcuts?: WidgetShortcut[];
  importedWidgetIds?: string[];
  accumulationStart?: string;
  dailyReminder?: { enabled: boolean; hour: number; minute: number };
  completedDays?: string[];
}
export interface WeeklySummary {
  weekStart: WeekKey; hasCashIncome: boolean; cashIncome: number;
  income: number; expenses: number; refunds: number; balance: number; balanceState: BalanceState;
  categoryExpenses: { categoryId: string; cents: number }[];
}
export interface WidgetSnapshot {
  weekStart: WeekKey; balanceState: BalanceState;
  calculatedAt: string;
}
export interface WidgetView { state: BalanceState | 'stale'; label: string; color: string }

export const initialCategories: Category[] = [
  { id: 'food', name: 'Alimentari', kind: 'expense' },
  { id: 'dining', name: 'Bar e ristoranti', kind: 'expense' },
  { id: 'transport', name: 'Trasporti', kind: 'expense' },
  { id: 'home', name: 'Casa e utenze', kind: 'expense' },
  { id: 'health', name: 'Salute', kind: 'expense' },
  { id: 'shopping', name: 'Acquisti', kind: 'expense' },
  { id: 'leisure', name: 'Svago', kind: 'expense' },
  { id: 'other', name: 'Altre spese', kind: 'expense' },
  { id: 'uncategorized', name: 'Da categorizzare', kind: 'expense' },
  { id: 'income', name: 'Altre entrate', kind: 'income' },
  { id: 'refund', name: 'Rimborsi', kind: 'income' },
];
export const emptyLedger = (): LedgerState => ({
  version: 3, transactions: [], cashIncome: {}, categories: [...initialCategories],
  rules: [],
});
// Hermes compatibility; state contains only JSON-compatible data.
export const cloneLedger = (state: LedgerState): LedgerState => JSON.parse(JSON.stringify(state)) as LedgerState;
