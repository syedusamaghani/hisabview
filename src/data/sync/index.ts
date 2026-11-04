// Sync, as the rest of the app sees it: one object with syncNow / restore / start, and a hook for
// the status line. The real server connection is loaded only when it is first needed.
import { createSync } from './engine';
import { supabaseRemote } from './remote';

export const sync = createSync(async () => {
  const { supabase } = await import('../../lib/supabase');
  return supabase ? supabaseRemote(supabase) : null;
});

export { createSync } from './engine';
export { describeSync, useSyncState } from './status';
export type { SyncState, SyncView } from './status';
export type { RestoreResult, SyncResult } from './engine';
