// The server side of sync, described as a small interface so the engine can be tested without
// internet. The real one (supabaseRemote) talks to Supabase; tests use a pretend server.
import type { SupabaseClient } from '@supabase/supabase-js';

export type SyncTable = 'shops' | 'parties' | 'entries' | 'audit_log';
export type RemoteRow = Record<string, unknown>;

// What went wrong when talking to the server:
//  network  = no internet or the server is not answering (try again later, lose nothing)
//  auth     = the login has expired (try again later; the login code refreshes it)
//  rejected = the server looked at this row and said no (a rule was broken); retrying will not help
export class RemoteError extends Error {
  constructor(
    public kind: 'network' | 'auth' | 'rejected',
    message: string,
    public code = '',
  ) {
    super(message);
  }
}

export interface Remote {
  // Adds the rows, or updates them when the id is already there (so sending twice is harmless).
  // ignoreDuplicates: leave an existing row alone (the audit diary is add-only).
  upsert(table: SyncTable, rows: RemoteRow[], options?: { ignoreDuplicates?: boolean }): Promise<void>;
  fetchMyShop(userId: string): Promise<RemoteRow | null>;
  // Rows of one table for the shop. `since` = only what changed at or after that time (null = everything).
  // If the server cannot say what changed (migration 0003 not run), it simply returns everything.
  fetchRows(table: Exclude<SyncTable, 'shops'>, shopId: string, since: string | null): Promise<RemoteRow[]>;
}

type PgError = { message: string; code?: string; details?: string } | null;

function fail(error: NonNullable<PgError>, status?: number): never {
  const code = error.code ?? '';
  if (code === 'PGRST301' || code === '401' || status === 401 || /jwt/i.test(error.message)) throw new RemoteError('auth', error.message, code);
  // A real database answer has a code (23505, 42501, ...). No code = we never got an answer.
  if (!code) throw new RemoteError('network', error.message);
  throw new RemoteError('rejected', error.message, code);
}

const PAGE = 1000;

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async upsert(table, rows, options) {
      if (rows.length === 0) return;
      const { error, status } = await client.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: options?.ignoreDuplicates ?? false });
      if (error) fail(error, status);
    },

    async fetchMyShop(userId) {
      const { data, error, status } = await client.from('shops').select('*').eq('owner_user_id', userId).maybeSingle();
      if (error) fail(error, status);
      return (data as RemoteRow | null) ?? null;
    },

    async fetchRows(table, shopId, since) {
      // audit_log has no updated_at (rows are never changed), the others do (after migration 0003)
      const timeColumn = table === 'audit_log' ? 'created_at' : 'updated_at';
      const read = async (useSince: boolean) => {
        const rows: RemoteRow[] = [];
        for (let from = 0; ; from += PAGE) {
          let query = client.from(table).select('*').eq('shop_id', shopId);
          if (useSince && since) query = query.gte(timeColumn, since);
          const { data, error, status } = await query.order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, from + PAGE - 1);
          if (error) {
            // Migration 0003 not run yet: the column does not exist
            if (error.code === '42703' && useSince) return null;
            fail(error, status);
          }
          rows.push(...((data as RemoteRow[] | null) ?? []));
          if (!data || data.length < PAGE) break;
        }
        return rows;
      };
      const changed = since ? await read(true) : null;
      return changed ?? (await read(false)) ?? [];
    },
  };
}
