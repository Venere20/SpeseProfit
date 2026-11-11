import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passwordProblem } from '../src/domain/ledger';

test('UI-01: interfaccia e Android rispettano gli stessi casi password sintetici', () => {
  const cases = readFileSync(new URL('./fixtures/password-policy.tsv', import.meta.url), 'utf8').trim().split('\n');
  for (const line of cases) {
    const [encoded, verdict, label] = line.split('\t');
    const raw = Buffer.from(encoded!, 'base64').toString('utf8');
    assert.equal(passwordProblem(raw) === null, verdict === 'allow', label!);
  }
});

test('UI-01: messaggi distinguono password attuale, nuova password e attesa senza esporre errori interni', async () => {
  const { passwordChangeMessage } = await import('../src/domain/passwordPolicy');
  assert.equal(passwordChangeMessage(new Error('Password attuale non valida.')), 'Password attuale non valida.');
  assert.equal(passwordChangeMessage(new Error('Questa password è troppo prevedibile.')), 'Questa password è troppo prevedibile.');
  assert.equal(passwordChangeMessage(new Error('Troppi tentativi. Attendi prima di riprovare.')), 'Troppi tentativi. Attendi prima di riprovare.');
  assert.doesNotMatch(passwordChangeMessage(new Error('private internal path')), /private internal/);
});
