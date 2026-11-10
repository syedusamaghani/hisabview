// Sync, as the rest of the app sees it: one object with syncNow / restore / start, and a hook for
// the status line. The real server connection is loaded only when it is first needed.
import { createSync } from './engine';
import { supabaseRemote } from './remote';
import { isTesting } from '../testMode';

const realSync = createSync(async () => {
  const { supabase } = await import('../../lib/supabase');
  return supabase ? supabaseRemote(supabase) : null;
});

// Testing mode never talks to the internet: nothing to send, nothing to bring back
const testingSync: typeof realSync = {
  syncNow: async () => 'skipped',
  restore: async () => 'none',
  start: () => () => {},
  flushOutbox: async () => {},
  blockedCount: () => 0,
};
export const sync = isTesting() ? testingSync : realSync;

export { createSync } from './engine';
export { describeSync, useSyncState } from './status';
export type { SyncState, SyncView } from './status';
export type { RestoreResult, SyncResult } from './engine';
