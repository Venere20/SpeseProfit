import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDays, calendarMonth, displayDate } from '../src/domain/calendar';
import { shiftDate, weekOf } from '../src/domain/ledger';

test('calendario lunedi-domenica con cambio anno e mesi adiacenti', () => {
  const days = calendarDays('2027-01-15');
  assert.equal(days.length, 42);
  assert.equal(days[0], '2026-12-28');
  assert.equal(days[41], '2027-02-07');
  assert.equal(weekOf(days[0]!), days[0]);
  days.forEach((day, index) => assert.equal(day, shiftDate(days[0]!, index)));
  assert.equal(new Set(days).size, 42);
});

test('calendario include il 29 febbraio soltanto negli anni bisestili', () => {
  assert.ok(calendarDays('2028-02-01').includes('2028-02-29'));
  assert.ok(!calendarDays('2027-02-01').some(day => day === '2027-02-29'));
  assert.equal(calendarMonth('2026-12-31', 1), '2027-01-01');
  assert.equal(calendarMonth('2027-01-31', -1), '2026-12-01');
});

test('giorni del calendario stabili al cambio ora e assegnati alla settimana giusta', () => {
  const days = calendarDays('2026-10-25');
  assert.ok(days.includes('2026-10-25'));
  assert.equal(weekOf('2026-10-25'), '2026-10-19');
  assert.equal(weekOf('2026-10-26'), '2026-10-26');
  assert.equal(displayDate('2026-10-25'), '25 ottobre 2026');
});


