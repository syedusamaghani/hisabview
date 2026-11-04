// What the sync engine is doing right now, so screens can show "Save ho gaya" or "Internet aate hi save hoga".
import { useSyncExternalStore } from 'react';

export type SyncState = {
  phase: 'idle' | 'syncing' | 'offline' | 'problem';
  pending: number; // changes on this phone that the server does not have yet
  blocked: number; // changes the server refused (a rule was broken); they stay on the phone
  lastSyncAt: string | null; // the last time everything was up to date with the server
};

const start: SyncState = { phase: 'idle', pending: 0, blocked: 0, lastSyncAt: null };
let state: SyncState = start;
const listeners = new Set<() => void>();

export const getSyncState = (): SyncState => state;

export function setSyncState(patch: Partial<SyncState>) {
  const next = { ...state, ...patch };
  if (next.phase === state.phase && next.pending === state.pending && next.blocked === state.blocked && next.lastSyncAt === state.lastSyncAt) return;
  state = next;
  listeners.forEach((l) => l());
}

export const resetSyncState = () => setSyncState(start);

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};

export const useSyncState = (): SyncState => useSyncExternalStore(subscribe, getSyncState);

// The four things a shopkeeper needs to know:
//  synced  = "Save ho gaya"                  (everything is on the server too)
//  queued  = "Internet aate hi save hoga"    (saved on the phone, waiting for internet)
//  syncing = "Save ho raha hai..."
//  problem = something was refused by the server
export type SyncView = 'synced' | 'queued' | 'syncing' | 'problem';

export function describeSync(s: SyncState): SyncView {
  if (s.blocked > 0) return 'problem';
  if (s.phase === 'syncing' && s.pending > 0) return 'syncing';
  if (s.pending === 0) return 'synced';
  return 'queued';
}
