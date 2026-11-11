import test from 'node:test';
import assert from 'node:assert/strict';
import { LedgerService } from '../src/application/ledgerService';
import { creditOverview, loanRemaining, validateLoans } from '../src/domain/credits';
import { emptyLedger, cloneLedger } from '../src/domain/model';
import { summary, widgetSnapshot } from '../src/domain/ledger';
import { loadLedger } from '../src/domain/migration';
import { monthlySummary } from '../src/domain/monthly';
import { annualSummary, compareMonths } from '../src/domain/reports';
import { accumulatedReport } from '../src/domain/progress';
const now = new Date('2026-10-21T12:00:00Z');
const loan = { direction: 'lent' as const, person: 'Amico', date: '2026-10-19', cents: 10000, origin: 'card' as const, note: '', dueDate: '2026-10-20' };
const refund = { date: '2026-10-21', cents: 2500, origin: 'card' as const, description: 'Reso' };
async function setup(initial = emptyLedger()) {
 let stored = cloneLedger(initial); let fail = false;
 const service = new LedgerService({ async load() { return cloneLedger(stored); }, async save(s) { if (fail) throw new Error('disco pieno'); stored = cloneLedger(s); } }, () => now);
 await service.init(); return { service, read: () => cloneLedger(stored), fail: () => { fail = true; } };
}
async function expense(s: LedgerService, cents = 10000, date = '2026-09-28') { await s.addExpense({ cents, date, description: 'Acquisto', origin: 'card', categoryId: 'shopping' }); return s.read().transactions.at(-1)!.id; }
test('rimborso parziale di una spesa precedente: data effettiva, mai nuovo incasso, aggregati coerenti', async () => {
 const { service } = await setup(); const id = await expense(service); await service.setWeeklyCashIncome('2026-10-19', 0); await service.saveRefund({ ...refund, refundFor: id }); const s = service.read();
 const week = summary(s, '2026-10-19'); assert.equal(week.income, 0); assert.equal(week.refunds, 2500); assert.equal(week.balance, 2500); assert.equal(week.balanceState, 'positive');
 assert.equal(summary(s, '2026-09-28').expenses, 10000); assert.equal(summary(s, '2026-09-28').refunds, 0);
 const month = monthlySummary(s, '2026-10', now); assert.equal(month.refunds, 2500); assert.equal(month.income, 0); assert.equal(month.balance, 2500);
 assert.equal(annualSummary(s, 2026, now).balance, -7500); assert.equal(accumulatedReport(s, '2026-09-28', now).balance, -7500);
 assert.equal(compareMonths(s, '2026-10', '2026-09', 'full', now).refunds.cents, 2500); assert.equal(widgetSnapshot(s, now).balanceState, 'positive');
});
test('rimborsi concorrenti non superano la spesa; modifica esclude se stessa e cancellazione riapre la quota', async () => {
 const { service } = await setup(); const id = await expense(service, 10000); const input = { ...refund, refundFor: id, cents: 6000 };
 const result = await Promise.allSettled([service.saveRefund(input), service.saveRefund(input)]); assert.equal(result.filter(r => r.status === 'fulfilled').length, 1);
 const rid = service.read().transactions.find(t => t.kind === 'refund')!.id;
 await service.saveRefund({ ...input, cents: 10000 }, rid); assert.equal(summary(service.read(), '2026-10-19').refunds, 10000);
 await service.deleteRefund(rid); await service.saveRefund({ ...input, cents: 10000 }); assert.equal(service.read().transactions.filter(t => t.kind === 'refund').length, 1);
});
test('spesa rimborsata non eliminabile, riducibile sotto quota o escludibile; correzione valida resta possibile', async () => {
 const { service } = await setup(); const id = await expense(service); await service.saveRefund({ ...refund, refundFor: id });
 const edit = { date: '2026-09-28', cents: 2000, description: 'Correzione', categoryId: 'shopping', origin: 'card' as const, classification: 'included' as const };
 await assert.rejects(service.deleteExpense(id)); await assert.rejects(service.updateExpense(id, edit)); await assert.rejects(service.updateClassification(id, 'shopping', 'excluded'));
 await service.updateExpense(id, { ...edit, cents: 9000 }); assert.equal(service.read().transactions.find(t => t.id === id)!.cents, -9000);
 await assert.rejects(service.updateExpense(id, { ...edit, cents: 9000, date: '2026-10-22' }));
});
test('rimborso senza collegamento e correzione della data non confermano uno zero incasso', async () => {
 const { service } = await setup(); await service.saveRefund(refund); const id = service.read().transactions[0]!.id;
 assert.equal(summary(service.read(), '2026-10-19').balanceState, 'incomplete');
 await service.saveRefund({ ...refund, date: '2026-10-12', cents: 500 }, id); assert.equal(summary(service.read(), '2026-10-19').refunds, 0); assert.equal(summary(service.read(), '2026-10-12').refunds, 500);
 await assert.rejects(service.saveRefund({ ...refund, date: '2026-10-22' })); await assert.rejects(service.saveRefund({ ...refund, cents: 0 }));
});
test('prestiti dati e ricevuti con restituzioni parziali: residui, scaduti, nessun guadagno o costo inventato', async () => {
 const { service } = await setup(); await service.saveLoan(loan); const lid = service.read().loans![0]!.id;
 await service.saveLoan({ ...loan, direction: 'borrowed', person: 'Familiare', cents: 5000, dueDate: undefined });
 await service.saveRepayment(lid, { date: '2026-10-21', cents: 2500, origin: 'card', note: 'Prima parte' });
 const s = service.read(); assert.deepEqual(creditOverview(s, '2026-10-21'), { receivable: 7500, payable: 5000, open: 2, overdue: 1 });
 assert.equal(summary(s, '2026-10-19').income, 0); assert.equal(summary(s, '2026-10-19').expenses, 0); assert.equal(summary(s, '2026-10-19').balance, 0);
 assert.equal(creditOverview(s, '2026-10-19').receivable, 10000);
});
test('restituzioni concorrenti, modifica e cancellazione rispettano la quota residua', async () => {
 const { service } = await setup(); await service.saveLoan(loan); const lid = service.read().loans![0]!.id;
 const payment = { date: '2026-10-21', cents: 6000, origin: 'card' as const, note: '' };
 const settled = await Promise.allSettled([service.saveRepayment(lid, payment), service.saveRepayment(lid, payment)]); assert.equal(settled.filter(r => r.status === 'fulfilled').length, 1);
 const rid = service.read().loans![0]!.repayments[0]!.id;
 await service.saveRepayment(lid, { ...payment, cents: 10000 }, rid); assert.equal(creditOverview(service.read(), '2026-10-21').open, 0);
 await service.deleteRepayment(lid, rid); assert.equal(loanRemaining(service.read().loans![0]!), 10000);
 await service.saveRepayment(lid, payment); assert.notEqual(service.read().loans![0]!.repayments[0]!.id, '');
});
test('date, scadenza, importi, inversione prestito e riduzione capitale già restituito sono protetti', async () => {
 const { service } = await setup(); await assert.rejects(service.saveLoan({ ...loan, dueDate: '2026-10-18' })); await assert.rejects(service.saveLoan({ ...loan, cents: 1.5 }));
 await service.saveLoan(loan); const lid = service.read().loans![0]!.id;
 await assert.rejects(service.saveRepayment(lid, { date: '2026-10-18', cents: 1, origin: 'card', note: '' })); await assert.rejects(service.saveRepayment(lid, { date: '2026-10-22', cents: 1, origin: 'card', note: '' }));
 await service.saveRepayment(lid, { date: '2026-10-20', cents: 5000, origin: 'cash', note: '' });
 await assert.rejects(service.saveLoan({ ...loan, cents: 4000 }, lid)); await assert.rejects(service.saveLoan({ ...loan, direction: 'borrowed' }, lid));
 await assert.rejects(service.saveLoan({ ...loan, date: '2026-10-21', dueDate: undefined }, lid));
});
test('archivi precedenti compatibili, riapertura conserva prestiti/rimborsi, reset elimina entrambi', async () => {
 assert.equal(loadLedger(emptyLedger()).state.loans, undefined); const { service, read } = await setup(); await service.saveLoan(loan); await service.saveRefund(refund);
 const restored = await setup(loadLedger(read()).state); assert.equal(restored.service.read().loans![0]!.person, 'Amico'); assert.equal(restored.service.read().transactions[0]!.kind, 'refund');
 await restored.service.reset(); assert.equal(restored.service.read().loans, undefined); assert.equal(restored.service.read().transactions.length, 0);
});
test('scrittura fallita non pubblica credito o rimborso; prestiti cancellati non ricompaiono alla riapertura', async () => {
 const app = await setup(); await app.service.saveLoan(loan); const lid = app.service.read().loans![0]!.id; await app.service.deleteLoan(lid); assert.equal(loadLedger(app.read()).state.loans!.length, 0);
 app.fail(); await assert.rejects(app.service.saveLoan(loan)); await assert.rejects(app.service.saveRefund(refund)); assert.equal(app.service.read().loans!.length, 0); assert.equal(app.service.read().transactions.length, 0);
});
test('migrazione rifiuta prestiti manomessi e riferimenti rimborso orfani o sovrappagati', async () => {
 const { service } = await setup(); const expenseId = await expense(service); await service.saveRefund({ ...refund, refundFor: expenseId }); await service.saveLoan(loan); const valid = service.read();
 const orphan = cloneLedger(valid); orphan.transactions = orphan.transactions.filter(t => t.id !== expenseId); assert.throws(() => loadLedger(orphan));
 const overpaid = cloneLedger(valid); overpaid.transactions.find(t => t.kind === 'refund')!.cents = 10001; assert.throws(() => loadLedger(overpaid));
 const invalid = cloneLedger(valid); invalid.loans![0]!.repayments = [{ id: 'r', date: '2026-10-21', cents: 10001, origin: 'card', note: '' }]; assert.throws(() => loadLedger(invalid));
 assert.throws(() => validateLoans([{ ...valid.loans![0], person: null }]));
 const duplicate = cloneLedger(valid); duplicate.transactions.push({ ...duplicate.transactions.find(t => t.kind === 'refund')! }); assert.throws(() => loadLedger(duplicate));
});
