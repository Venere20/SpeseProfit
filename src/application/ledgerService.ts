import { applyBankMessages, BankAutomation, BankMessage, validateBankData } from '../domain/fineco';
import { cleanLoan, cleanRepayment, cleanRefund, loanRepaid, refundedCents, validateLoans, LoanInput, RepaymentInput, RefundInput } from '../domain/credits';
import { validateShortcuts } from '../domain/shortcuts';
import { validateWidgetExpense, validateWidgetSlots } from '../domain/widgetQueue';
import { validateMonday, validateReminder } from '../domain/progress';
import { TemplateInput, validateTemplate } from '../domain/templates';
import { loadLedger } from '../domain/migration';
import { assertCents, categoryFor, isRefund, normalize, romeDate, validateDate, weekOf } from '../domain/ledger';
import { CategoryKind, LedgerState, Transaction, cloneLedger, emptyLedger } from '../domain/model';
import { StateStorage } from '../ports';

export interface ExpenseInput {
  date: string; cents: number; description: string; categoryId: string; origin: 'cash' | 'card' | 'account';
}
function validateExpense(input: ExpenseInput) {
  assertCents(input.cents, false); validateDate(input.date);
  if (!['cash', 'card', 'account'].includes(input.origin)) throw new Error('Metodo di pagamento non valido.');
  if (!input.description.trim() || input.description.trim().length > 200) throw new Error('Inserisci una descrizione di massimo 200 caratteri.');
}
function expenseFields(state: LedgerState, input: ExpenseInput) {
  const categoryId = input.categoryId || categoryFor(state, input.description, -input.cents);
  if (!state.categories.some(c => c.id === categoryId && c.kind === 'expense')) throw new Error('Categoria di spesa non valida.');
  return { date: input.date, cents: -input.cents, description: input.description.trim(),
    origin: input.origin, categoryId, manualCategory: !!input.categoryId };
}

export class LedgerService {
  private state: LedgerState = emptyLedger();
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;
  private assertOpen() { if (this.disposed) throw new Error('Archivio bloccato. Sbloccalo di nuovo.'); }
  dispose() { this.disposed = true; this.state = emptyLedger(); }
  constructor(private storage: StateStorage, private now: () => Date = () => new Date()) {}
  async init(): Promise<LedgerState> {
    this.assertOpen(); const loaded = await this.storage.load(); this.assertOpen();
    const result = loaded === null ? { state: emptyLedger(), migrated: false } : loadLedger(loaded);
    // Persist migration before exposing totals; failed writes leave the archive locked.
    if (result.migrated) { await this.storage.save(result.state); this.assertOpen(); }
    this.state = result.state; return this.read();
  }
  read(): LedgerState { this.assertOpen(); return cloneLedger(this.state); }
  private mutate(fn: (current: LedgerState) => LedgerState | Promise<LedgerState>): Promise<LedgerState> {
    const result = this.queue.then(async () => {
      this.assertOpen();
      const next = await fn(this.read());
      this.assertOpen();
      await this.storage.save(next); // Publish only after persistence succeeds.
      this.assertOpen();
      this.state = next;
      return this.read();
    });
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
  private actualDate(date: string) {
    validateDate(date); if (date > romeDate(this.now())) throw new Error('Scegli una data già trascorsa o di oggi.');
  }
  private id(prefix: string, ids: string[]) {
    const base = `${prefix}:${this.now().getTime()}:`; let n = ids.length;
    while (ids.includes(base + n)) n++; return base + n;
  }
  saveRefund(input: RefundInput, id?: string) {
    return this.mutate(s => {
      this.actualDate(input.date);
      if (id !== undefined && !s.transactions.some(t => t.id === id && isRefund(t))) throw new Error('Rimborso non trovato.');
      const clean = cleanRefund(s, input, id);
      if (!s.categories.some(c => c.id === 'refund')) s.categories.push({ id: 'refund', name: 'Rimborsi', kind: 'income' });
      const transaction: Transaction = { ...clean, id: id ?? this.id('refund', s.transactions.map(t => t.id)), kind: 'refund', categoryId: 'refund', classification: 'included', manualCategory: true };
      if (id === undefined) s.transactions.push(transaction);
      else s.transactions = s.transactions.map(t => t.id === id ? transaction : t);
      return s;
    });
  }
  deleteRefund(id: string) {
    return this.mutate(s => {
      if (!s.transactions.some(t => t.id === id && isRefund(t))) throw new Error('Rimborso non trovato.');
      s.transactions = s.transactions.filter(t => t.id !== id); return s;
    });
  }
  saveLoan(input: LoanInput, id?: string) {
    return this.mutate(s => {
      this.actualDate(input.date); const clean = cleanLoan(input); const previous = s.loans?.find(l => l.id === id);
      if (id !== undefined && !previous) throw new Error('Prestito non trovato.');
      if (previous?.repayments.length && previous.direction !== clean.direction) throw new Error('Non puoi invertire un prestito che ha già restituzioni.');
      const loan = { ...clean, id: previous?.id ?? this.id('loan', (s.loans ?? []).map(l => l.id)), repayments: previous?.repayments ?? [] };
      s.loans = validateLoans(previous ? s.loans!.map(l => l.id === id ? loan : l) : [...(s.loans ?? []), loan]); return s;
    });
  }
  saveRepayment(loanId: string, input: RepaymentInput, id?: string) {
    return this.mutate(s => {
      this.actualDate(input.date); const loan = s.loans?.find(l => l.id === loanId);
      if (!loan) throw new Error('Prestito non trovato.');
      const clean = cleanRepayment(input);
      if (clean.date < loan.date) throw new Error('La restituzione non può precedere il prestito.');
      if (id !== undefined && !loan.repayments.some(r => r.id === id)) throw new Error('Restituzione non trovata.');
      const already = loanRepaid(loan) - (loan.repayments.find(r => r.id === id)?.cents ?? 0);
      if (already + clean.cents > loan.cents) throw new Error('La restituzione supera la somma ancora dovuta.');
      const repayment = { ...clean, id: id ?? this.id('repayment', loan.repayments.map(r => r.id)) };
      loan.repayments = id === undefined ? [...loan.repayments, repayment] : loan.repayments.map(r => r.id === id ? repayment : r);
      return s;
    });
  }
  deleteRepayment(loanId: string, id: string) {
    return this.mutate(s => {
      const loan = s.loans?.find(l => l.id === loanId);
      if (!loan?.repayments.some(r => r.id === id)) throw new Error('Restituzione non trovata.');
      loan.repayments = loan.repayments.filter(r => r.id !== id); return s;
    });
  }
  deleteLoan(id: string) {
    return this.mutate(s => {
      if (!s.loans?.some(l => l.id === id)) throw new Error('Prestito non trovato.');
      s.loans = s.loans.filter(l => l.id !== id); return s;
    });
  }
  configureWidgetShortcuts(raw: unknown) {
    return this.mutate(s => { s.widgetShortcuts = validateShortcuts(raw, s.categories); return s; });
  }
  configureWidgetSlots(raw: unknown) {
    const slots = validateWidgetSlots(raw);
    return this.mutate(s => {
      if (slots.some(id => id && !s.expenseTemplates?.some(t => t.id === id))) throw new Error('Modello non disponibile.');
      s.widgetSlots = slots; return s;
    });
  }
  importWidgetExpenses(items: unknown[]) {
    return this.mutate(s => {
      const seen = new Set(s.importedWidgetIds ?? []);
      for (const raw of items) {
        const input = validateWidgetExpense(raw, s);
        if (seen.has(input.id)) continue;
        if (s.transactions.some(t => t.id === input.id)) throw new Error('Identificativo widget già presente.');
        s.transactions.push({ id: input.id, ...expenseFields(s, { ...input.template, date: input.date }), classification: 'included' });
        seen.add(input.id);
      }
      s.importedWidgetIds = [...seen]; return s;
    });
  }
  setAccumulationStart(week?: string) {
    if (week !== undefined) { validateMonday(week); if (week > weekOf(romeDate(this.now()))) throw new Error('La settimana non può essere futura.'); }
    return this.mutate(s => { if (week === undefined) delete s.accumulationStart; else s.accumulationStart = week; return s; });
  }
  setDailyReminder(value: unknown) {
    const settings = validateReminder(value);
    return this.mutate(s => ({ ...s, dailyReminder: settings }));
  }
  completeToday(completed: boolean) {
    const today = romeDate(this.now());
    return this.mutate(s => ({ ...s, completedDays: [...(s.completedDays ?? []).filter(d => d !== today), ...(completed ? [today] : [])].sort() }));
  }
  setWeeklyCashIncome(week: string, cents: number) {
    assertCents(cents);
    if (weekOf(week) !== week) throw new Error('Seleziona una settimana valida.');
    return this.mutate(s => ({ ...s, cashIncome: { ...s.cashIncome, [week]: cents }, bankIncomeReviewWeeks:(s.bankIncomeReviewWeeks??[]).filter(w=>w!==week) }));
  }
  addExpense(input: ExpenseInput) {
    validateExpense(input);
    return this.mutate(s => {
      const prefix = `${input.origin}:${this.now().getTime()}:`;
      let suffix = s.transactions.length;
      while (s.transactions.some(t => t.id === prefix + suffix)) suffix++;
      const transaction: Transaction = { id: prefix + suffix, ...expenseFields(s, input), classification: 'included' };
      return { ...s, transactions: [...s.transactions, transaction] };
    });
  }
  updateExpense(id: string, input: ExpenseInput & { classification: Transaction['classification'] }, ruleText?: string) {
    validateExpense(input);
    return this.mutate(s => {
      const index = s.transactions.findIndex(t => t.id === id && t.cents < 0);
      if (index < 0) throw new Error('Spesa non trovata.');
      if (!['included', 'transfer', 'excluded'].includes(input.classification)) throw new Error('Classificazione non valida.');
      const previous = s.transactions[index]!;
      const refunds = refundedCents(s, id);
      if (refunds && (input.cents < refunds || input.classification !== 'included' || s.transactions.some(t => t.refundFor === id && t.date < input.date))) throw new Error('La spesa deve restare inclusa, almeno pari ai rimborsi e con data non successiva ai rimborsi.');
      const next: Transaction = { ...previous, ...expenseFields(s, input), classification: input.classification };
      s.transactions[index] = next;
      this.applyRule(s, next.categoryId, ruleText);
      return s;
    });
  }
  deleteExpense(id: string) {
    return this.mutate(s => {
      const index = s.transactions.findIndex(t => t.id === id && t.cents < 0);
      if (index < 0) throw new Error('Spesa non trovata.');
      if (refundedCents(s, id) > 0) throw new Error('Elimina prima i rimborsi collegati a questa spesa.');
      s.transactions.splice(index, 1);
      return s;
    });
  }
  private applyRule(state: LedgerState, categoryId: string, ruleText?: string) {
    const match = ruleText ? normalize(ruleText) : '';
    if (ruleText !== undefined && match.length < 3) throw new Error('La regola deve contenere almeno 3 caratteri.');
    if (match) state.rules.push({ id: `rule:${this.now().getTime()}:${state.rules.length}`, match, categoryId });
  }
  updateClassification(id: string, categoryId: string, classification: Transaction['classification'], ruleText?: string) {
    return this.mutate(s => {
      const t = s.transactions.find(t => t.id === id);
      if (!t) throw new Error('Movimento non trovato.');
      if (t.kind === 'refund') throw new Error('Modifica questo movimento dalla sezione Rimborsi.');
      if (refundedCents(s, id) > 0 && classification !== 'included') throw new Error('La spesa ha rimborsi collegati: deve restare inclusa nel bilancio.');
      if (!s.categories.some(c => c.id === categoryId && c.kind === (t.cents < 0 ? 'expense' : 'income'))) throw new Error('Categoria non valida per questo movimento.');
      if (!['included', 'transfer', 'excluded'].includes(classification)) throw new Error('Classificazione non valida.');
      t.categoryId = categoryId; t.classification = classification; t.manualCategory = true;
      this.applyRule(s, categoryId, ruleText);
      return s;
    });
  }
  addCategory(name: string, kind: CategoryKind) {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 40) throw new Error('Il nome deve contenere da 2 a 40 caratteri.');
    return this.mutate(s => {
      if (s.categories.some(c => normalize(c.name) === normalize(clean))) throw new Error('Categoria già presente.');
      s.categories.push({ id: `custom:${this.now().getTime()}:${s.categories.length}`, name: clean, kind });
      return s;
    });
  }
  saveExpenseTemplate(input: TemplateInput, id?: string) {
    return this.mutate(s => {
      const clean = validateTemplate(input, s.categories);
      const templates = s.expenseTemplates ?? [];
      if (id !== undefined && !templates.some(t => t.id === id)) throw new Error('Modello non trovato.');
      if (templates.some(t => t.id !== id && normalize(t.description) === normalize(clean.description) && t.cents === clean.cents && t.categoryId === clean.categoryId && t.origin === clean.origin)) throw new Error('Questo modello è già presente.');
      if (id === undefined) {
        const prefix = `template:${this.now().getTime()}:`;
        let suffix = templates.length;
        while (templates.some(t => t.id === prefix + suffix)) suffix++;
        s.expenseTemplates = [...templates, { id: prefix + suffix, ...clean }];
      } else {
        s.expenseTemplates = templates.map(t => t.id === id ? { id, ...clean } : t);
      }
      return s;
    });
  }
  deleteExpenseTemplate(id: string) {
    return this.mutate(s => {
      if (!s.expenseTemplates?.some(t => t.id === id)) throw new Error('Modello non trovato.');
      s.expenseTemplates = s.expenseTemplates.filter(t => t.id !== id);
      if (s.widgetSlots) s.widgetSlots = s.widgetSlots.map(value => value === id ? '' : value);
      return s;
    });
  }
  configureBankAutomation(config:BankAutomation) {
    validateBankData({bankAutomation:config});return this.mutate(s=>({...s,bankAutomation:{...config}}));
  }
  importBankEvents(messages:BankMessage[]) { return this.mutate(s=>applyBankMessages(s,messages)); }
  resolveBankReview(id:string,classification:'included'|'transfer'|'excluded',targetId?:string) {
    return this.mutate(s=>{
      const item=s.bankReview?.find(r=>r.message.source+':'+r.message.id===id);if(!item?.event)throw new Error('Avviso non riconosciuto: correggi manualmente o ignora.');
      const e=item.event;
      if(e.status==='rejected'||e.status==='cancelled'){
        const target=s.transactions.find(t=>t.id===targetId&&t.bankEvent&&t.cents<0&&Math.abs(t.cents)===Math.abs(e.cents));
        if(!target)throw new Error('Seleziona il bonifico interessato.');target.classification='excluded';target.bankEvent={...target.bankEvent!,status:e.status};
      }else if(targetId){const target=s.transactions.find(t=>t.id===targetId&&t.bankEvent?.status==='submitted'&&t.cents===e.cents);if(!target)throw new Error('Collegamento non valido.');target.bankEvent={...target.bankEvent!,status:e.status};}
      else s.transactions.push({id:'fineco:'+e.id,origin:e.source==='sms'?'card':'account',date:e.date,cents:e.cents,description:e.counterparty,categoryId:e.cents>0?'income':'uncategorized',classification,manualCategory:true,bankEvent:e});
      if(e.cents>0&&classification==='included'&&Object.hasOwn(s.cashIncome,weekOf(e.date)))s.bankIncomeReviewWeeks=[...new Set([...(s.bankIncomeReviewWeeks??[]),weekOf(e.date)])];
      s.bankReview=s.bankReview!.filter(r=>r!==item);return s;
    });
  }
  updateBankMovement(id:string,cents:number,description:string,classification:'included'|'transfer'|'excluded') {
    assertCents(Math.abs(cents),false);if(!description.trim()||description.length>200||!['included','transfer','excluded'].includes(classification))throw new Error('Controlla i campi.');
    return this.mutate(s=>{const t=s.transactions.find(t=>t.id===id&&t.bankEvent);if(!t||Math.sign(cents)!==Math.sign(t.cents))throw new Error('Movimento non disponibile.');
      if(refundedCents(s,id)>0&&(classification!=='included'||-cents<refundedCents(s,id)))throw new Error('Controlla i rimborsi collegati.');
      t.cents=cents;t.description=description.trim();t.classification=classification;return s;});
  }
  deleteBankMovement(id:string) {return this.mutate(s=>{const t=s.transactions.find(t=>t.id===id&&t.bankEvent);if(!t||refundedCents(s,id)>0)throw new Error('Movimento non eliminabile.');s.transactions=s.transactions.filter(t=>t.id!==id);return s;});}
  dismissBankReview(id:string) {return this.mutate(s=>({...s,bankReview:(s.bankReview??[]).filter(r=>r.message.source+':'+r.message.id!==id)}));}
  reset() { return this.mutate(() => emptyLedger()); }
}
