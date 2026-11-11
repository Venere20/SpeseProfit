import { importBankPending, syncBankGmail, onBankInboxChanged } from '../adapters/native/bank';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { LedgerService } from '../application/ledgerService';
import { LedgerState, WidgetSnapshot } from '../domain/model';
import { passwordProblem, romeDate, weekOf, widgetSnapshot } from '../domain/ledger';
import { assertSessionTimeout, SessionWindow } from '../domain/session';
import { publishNativeWidget } from '../adapters/native/widget';
import { discardProtectedWidgetPending, changeProtectedPassword, getProtectedSessionTimeout, lockProtectedVault, openProtectedVault, protectedVaultAvailable, resumeProtectedVault, sessionRetentionAvailable, setProtectedSessionTimeout, touchProtectedVault, vaultStatus } from '../adapters/native/vault';

export type ArchiveStatus = 'unavailable' | 'missing' | 'ready' | 'damaged';
interface Runtime {
  state: LedgerState | null; week: string; setWeek: (week: string) => void;
  loading: boolean; error: string | null; busy: boolean; locked: boolean;
  protectedStatus: ArchiveStatus;
  sessionTimeout: number; sessionSettingsAvailable: boolean;
  configureSessionTimeout: (milliseconds: number) => Promise<void>;
  run: (fn: (service: LedgerService) => Promise<LedgerState>) => Promise<void>;
  lock: () => void;
  openVault: (password: string, create: boolean) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  touchActivity: () => void;
  publishedWidgetSnapshot: WidgetSnapshot | null; widgetPublishError: boolean;
  discardPendingWidget: () => Promise<void>;
  syncFineco: () => Promise<void>;
}
const Context = createContext<Runtime | null>(null);
const isActive = () => AppState.currentState === 'active' || Platform.OS === 'web';

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const service = useRef<LedgerService | null>(null);
  const unlocked = useRef(false);
  const generation = useRef(0);
  const opening = useRef(false);
  const resuming = useRef(false);
  const canResume = useRef(false);
  const resumeHandler = useRef<((restore?: boolean) => Promise<void>) | null>(null);
  const sessionWindow = useRef(new SessionWindow());
  const ticket = useRef<number | null>(null);
  const [state, setState] = useState<LedgerState | null>(null);
  const [week, setWeek] = useState(weekOf(romeDate()));
  const [widgetDay, setWidgetDay] = useState(romeDate());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(true);
  const [protectedStatus, setProtectedStatus] = useState<ArchiveStatus>('unavailable');
  const [sessionTimeout, setSessionTimeout] = useState(0);
  const lastNativeTouch = useRef(0);
  const [publishedWidgetSnapshot,setPublishedWidgetSnapshot] = useState<WidgetSnapshot | null>(null);
  const [widgetPublishError,setWidgetPublishError] = useState(false);

  const lock = useCallback(() => {
    generation.current++; unlocked.current = false; canResume.current = false;
    sessionWindow.current.clear();
    service.current?.dispose(); service.current = null; ticket.current = null;
    setLocked(true); setState(null); setBusy(false);
    void lockProtectedVault().catch(() => { /* Native expiry independently invalidates access. */ });
  }, []);

  const suspend = useCallback(() => {
    if (unlocked.current) canResume.current = sessionWindow.current.mayResume();
    generation.current++; unlocked.current = false;
    service.current?.dispose(); service.current = null; ticket.current = null;
    setLocked(true); setState(null); setBusy(false);
    if (!canResume.current) {
      sessionWindow.current.clear();
      void lockProtectedVault().catch(() => undefined);
    }
  }, []);

  const resume = useCallback(async (restore = false): Promise<void> => {
    if (!canResume.current || resuming.current || opening.current || !isActive()) return;
    if (!restore && !sessionWindow.current.mayResume()) { lock(); return; }
    resuming.current = true;
    const epoch = generation.current;
    setBusy(true);
    let restored: LedgerService | null = null;
    try {
      let restoredTicket: number | null = null;
      {
        const result = await resumeProtectedVault();
        if (!result) {
          if (epoch === generation.current) { canResume.current = false; sessionWindow.current.clear(); }
          return;
        }
        restored = result.service; restoredTicket = result.ticket;
        const duration = await getProtectedSessionTimeout();
        if (epoch === generation.current) { sessionWindow.current.setDuration(duration); setSessionTimeout(duration); }
      }
      if (epoch !== generation.current || !isActive()) { restored.dispose(); return; }
      service.current = restored; ticket.current = restoredTicket;
      unlocked.current = true; canResume.current = false; sessionWindow.current.start();
      setState(restored.read()); setLocked(false);
    } catch {
      restored?.dispose();
      if (epoch === generation.current) lock();
    } finally {
      resuming.current = false;
      if (epoch === generation.current) setBusy(false);
      // A fast background/foreground cycle can supersede an earlier resume.
      if (epoch !== generation.current && canResume.current && isActive()) {
        setTimeout(() => { void resumeHandler.current?.(restore); }, 0);
      }
    }
  }, [lock]);

  useEffect(() => {
    resumeHandler.current = resume;
    return () => { resumeHandler.current = null; };
  }, [resume]);

  const release = useCallback(() => {
    generation.current++; unlocked.current = false;
    service.current?.dispose(); service.current = null; ticket.current = null;
    if (!sessionWindow.current.mayResume()) void lockProtectedVault().catch(() => undefined);
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const [status, duration] = await Promise.all([vaultStatus(), getProtectedSessionTimeout()]);
        if (!live) return;
        setProtectedStatus(status);
        sessionWindow.current.setDuration(duration); setSessionTimeout(duration);
        if (status === 'ready' && duration > 0 && isActive()) {
          canResume.current = true;
          await resume(true);
        }
        if (live) setLoading(false);
      } catch {
        if (live) { setError('Impossibile verificare l’archivio protetto. Nessun archivio alternativo aperto.'); setLoading(false); }
      }
    })();
    return () => {
      live = false; release();
    };
  }, [release, resume]);

  const touchActivity = useCallback(() => {
    if (!unlocked.current || !isActive()) return;
    if (sessionWindow.current.expired()) { lock(); return; }
    sessionWindow.current.touch();
    const now = performance.now();
    if (ticket.current !== null && now - lastNativeTouch.current >= 1000) {
      lastNativeTouch.current = now;
      const epoch = generation.current;
      void touchProtectedVault(ticket.current).catch(() => {
        if (unlocked.current && epoch === generation.current) lock();
      });
    }
  }, [lock]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') suspend();
      else { setWidgetDay(romeDate()); if (canResume.current) void resume(); }
    });
    const interval = setInterval(() => {
      if (isActive()) setWidgetDay(romeDate());
      if ((unlocked.current || canResume.current) && sessionWindow.current.expired()) lock();
    }, 1000);
    if (Platform.OS === 'web') {
      globalThis.addEventListener?.('pointerdown', touchActivity); globalThis.addEventListener?.('keydown', touchActivity);
    }
    return () => {
      listener.remove(); clearInterval(interval);
      if (Platform.OS === 'web') {
        globalThis.removeEventListener?.('pointerdown', touchActivity); globalThis.removeEventListener?.('keydown', touchActivity);
      }
    };
  }, [lock, resume, suspend, touchActivity]);

  useEffect(() => {
    if (!state) return;
    let live = true;
    const snapshot = widgetSnapshot(state);
    void publishNativeWidget(snapshot).then(() => {
      if (live) { setPublishedWidgetSnapshot(snapshot); setWidgetPublishError(false); }
    }).catch(() => { if (live) setWidgetPublishError(true); });
    return () => { live = false; };
  }, [state, widgetDay]);

  useEffect(()=>{
    const sub=onBankInboxChanged(()=>{
      const current=service.current;const currentTicket=ticket.current;const epoch=generation.current;
      if(!unlocked.current||!current||currentTicket===null)return;
      void importBankPending(currentTicket,current).then(()=>{if(unlocked.current&&epoch===generation.current)setState(current.read());}).catch(()=>undefined);
    });return()=>sub.remove();
  },[]);
  const syncFineco = async () => {
    const current=service.current;const currentTicket=ticket.current;
    if(!current||currentTicket===null||!unlocked.current)throw new Error('Sblocca prima l’archivio.');
    const epoch=generation.current;setBusy(true);
    try {
      await importBankPending(currentTicket,current);
      if(epoch!==generation.current||!unlocked.current)return;
      setState(current.read());
      await syncBankGmail();
      if(epoch!==generation.current||!unlocked.current)return;
      await importBankPending(currentTicket,current);
      if(epoch===generation.current&&unlocked.current)setState(current.read());
    } finally {if(epoch===generation.current)setBusy(false);}
  };
  const run = async (fn: (s: LedgerService) => Promise<LedgerState>) => {
    if (!unlocked.current || !service.current) throw new Error('Sblocca prima l’archivio.');
    const epoch = generation.current;
    setBusy(true); touchActivity();
    try { const next = await fn(service.current); if (unlocked.current && epoch === generation.current) setState(next); }
    finally { if (epoch === generation.current) setBusy(false); }
  };
  const openVault = async (value: string, create: boolean) => {
    if (opening.current || resuming.current || unlocked.current) throw new Error('Operazione già in corso.');
    opening.current = true; setBusy(true);
    const epoch = generation.current;
    let next: LedgerService | null = null;
    try {
      if (!isActive()) throw new Error('Apri l’app prima di sbloccare.');
      if (!protectedVaultAvailable) throw new Error('Serve la build Android dedicata.');
      if (create) { const problem = passwordProblem(value); if (problem) throw new Error(problem); }
      const result = await openProtectedVault(value, create);
      next = result.service;
      const duration = await getProtectedSessionTimeout();
      if (epoch !== generation.current || !isActive()) throw new Error('Accesso interrotto. Sblocca di nuovo.');
      sessionWindow.current.setDuration(duration); setSessionTimeout(duration);
      setProtectedStatus('ready'); ticket.current = result.ticket; service.current = next;
      unlocked.current = true; canResume.current = false; sessionWindow.current.start();
      setState(next.read()); setLocked(false);
    } catch (error) {
      next?.dispose();
      if (epoch === generation.current) lock();
      throw error;
    } finally {
      try { setProtectedStatus(await vaultStatus()); }
      catch { setError('Impossibile verificare l’archivio protetto.'); }
      opening.current = false; if (epoch === generation.current) setBusy(false);
    }
  };
  const configureSessionTimeout = async (milliseconds: number) => {
    assertSessionTimeout(milliseconds);
    if (!unlocked.current) throw new Error('Sblocca prima l’archivio.');
    const epoch = generation.current;
    touchActivity();
    {
      if (ticket.current === null) throw new Error('Sessione non disponibile.');
      await setProtectedSessionTimeout(ticket.current, milliseconds);
    }
    if (epoch !== generation.current || !unlocked.current) throw new Error('Accesso interrotto. Riapri le impostazioni.');
    sessionWindow.current.setDuration(milliseconds); sessionWindow.current.start(); setSessionTimeout(milliseconds);
  };
  const discardPendingWidget = async () => {
    if (!unlocked.current || ticket.current === null) throw new Error('Sblocca l’archivio.');
    await discardProtectedWidgetPending(ticket.current);
  };
  const changePassword = async (current: string, next: string) => {
    if (!unlocked.current) throw new Error('Sblocca prima l’archivio.');
    const problem = passwordProblem(next); if (problem) throw new Error(problem);
    if (ticket.current === null) throw new Error('Sessione non disponibile.');
    await changeProtectedPassword(ticket.current, current, next);
    sessionWindow.current.touch();
  };
  return <Context.Provider value={{ state, week, setWeek, loading, error, busy, locked, protectedStatus,
    sessionTimeout, sessionSettingsAvailable: sessionRetentionAvailable, configureSessionTimeout,
    run, openVault, lock, changePassword, touchActivity, discardPendingWidget, syncFineco, publishedWidgetSnapshot, widgetPublishError }}>{children}</Context.Provider>;
}
export function useRuntime() { const value = useContext(Context); if (!value) throw new Error('Runtime non disponibile.'); return value; }



