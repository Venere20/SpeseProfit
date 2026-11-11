// NFC is also used by native derivation. Whitespace is preserved in the actual password.
export function passwordProblem(raw: string): string | null {
  const value = raw.normalize('NFC');
  const length = Array.from(value).length;
  if (length < 16 || length > 128) return 'Usa da 16 a 128 caratteri. Spazi ammessi.';
  const comparison = value.toLowerCase().replace(/^[\s\u001c-\u001f]+|[\s\u001c-\u001f]+$/gu, '');
  if (/^(.{1,8})\1+$/su.test(value) || ['passwordpassword', '1234567890123456', 'abcdefghijklmnop', 'qwertyuiopasdfghj', 'questa è soltanto una demo'].includes(comparison)) return 'Questa password è troppo prevedibile.';
  return null;
}
export function passwordChangeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const known = ['Password attuale non valida.', 'Troppi tentativi. Attendi prima di riprovare.', 'Questa password è troppo prevedibile.', 'Usa da 16 a 128 caratteri. Spazi ammessi.'];
  return known.find(value => message.includes(value)) ?? 'Cambio non completato. Riprova dopo aver sbloccato l’archivio.';
}
