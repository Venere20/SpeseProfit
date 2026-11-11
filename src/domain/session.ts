export const SESSION_OPTIONS = [
  { milliseconds: 0, label: 'Subito' },
  { milliseconds: 60_000, label: '1 minuto' },
  { milliseconds: 300_000, label: '5 minuti' },
  { milliseconds: 900_000, label: '15 minuti' },
  { milliseconds: 1_800_000, label: '30 minuti' },
] as const;

export function assertSessionTimeout(value: number): void {
  if (!SESSION_OPTIONS.some(option => option.milliseconds === value)) throw new Error('Durata della sessione non valida.');
}

// Only an in-memory authorization window. It never contains a password or key.
// Native Android independently enforces expiry with elapsedRealtime.
export class SessionWindow {
  private lastActivity: number | null = null;
  private duration = 0;
  constructor(private readonly clock: () => number = () => performance.now()) {}
  setDuration(value: number) { assertSessionTimeout(value); this.duration = value; }
  get milliseconds() { return this.duration; }
  start() { this.lastActivity = this.clock(); }
  touch() { if (this.lastActivity !== null && !this.expired()) this.lastActivity = this.clock(); }
  clear() { this.lastActivity = null; }
  expired() {
    if (this.lastActivity === null) return true;
    const elapsed = this.clock() - this.lastActivity;
    return !Number.isFinite(elapsed) || elapsed < 0 || elapsed >= (this.duration || 120_000);
  }
  mayResume() { return this.duration > 0 && !this.expired(); }
}


