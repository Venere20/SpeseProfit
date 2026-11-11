import { LedgerState } from '../domain/model';
export interface StateStorage { load(): Promise<unknown>; save(state: LedgerState): Promise<void> }
