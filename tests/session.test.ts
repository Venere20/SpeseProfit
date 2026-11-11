import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSessionTimeout, SessionWindow } from '../src/domain/session';

test('sessione sempre bloccata al ritorno con Subito, inattivita in primo piano di due minuti', () => {
  let now = 0;
  const session = new SessionWindow(() => now);
  session.start();
  assert.equal(session.mayResume(), false);
  now = 119_999; assert.equal(session.expired(), false);
  now = 120_000; assert.equal(session.expired(), true);
});

test('sessione riprendibile prima della scadenza, mai al limite o dopo', () => {
  let now = 0;
  const session = new SessionWindow(() => now);
  session.setDuration(300_000); session.start();
  now = 299_999; assert.equal(session.mayResume(), true);
  now = 300_000; assert.equal(session.mayResume(), false);
  now = 999_999; assert.equal(session.mayResume(), false);
});

test('solo attivita e sblocco rinnovano la durata; controllo non rinnova e blocco cancella', () => {
  let now = 0;
  const session = new SessionWindow(() => now);
  session.setDuration(60_000); session.start();
  now = 59_000; assert.equal(session.mayResume(), true); session.touch();
  now = 60_000; assert.equal(session.mayResume(), true);
  now = 119_000; assert.equal(session.mayResume(), false);
  session.touch(); assert.equal(session.mayResume(), false);
  session.start(); session.clear(); assert.equal(session.mayResume(), false);
  session.touch(); assert.equal(session.mayResume(), false);
  const fresh = new SessionWindow(() => now);
  fresh.setDuration(1_800_000); assert.equal(fresh.mayResume(), false);
});

test('durate arbitrarie o orologio tornato indietro non prolungano la sessione', () => {
  for (const duration of [-1, 1, 60_001, 86_400_000, Infinity, NaN]) assert.throws(() => assertSessionTimeout(duration));
  let now = 100;
  const session = new SessionWindow(() => now);
  session.setDuration(60_000); session.start();
  now = 0; assert.equal(session.mayResume(), false);
});


