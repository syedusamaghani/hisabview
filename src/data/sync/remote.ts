// The server side of sync, described as a small interface so the engine can be tested without
// internet. The real one (supabaseRemote) talks to Supabase; tests use a pretend server.
import type { SupabaseClient } from '@supabase/supabase-js';

export type SyncTable = 'shops' | 'parties' | 'entries' | 'audit_log';
// Messages to us (add-only tables): see supabase/migrations/0004_feedback_errors.sql
export type LogTable = 'feedback' | 'error_log';
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

// What the server says about this login in a shop ('unknown' = the server cannot say, for example migration 0005 not run yet)
export type RemoteRole = 'owner' | 'manager' | 'cashier' | 'revoked' | 'unknown';

export interface Remote {
  // Adds the rows, or updates them when the id is already there (so sending twice is harmless).
  // ignoreDuplicates: leave an existing row alone (the audit diary is add-only).
  upsert(table: SyncTable | LogTable, rows: RemoteRow[], options?: { ignoreDuplicates?: boolean }): Promise<void>;
  // The shop this login belongs to (its own, or the one it was invited to)
  fetchMyShop(userId: string): Promise<RemoteRow | null>;
  // An invited email becomes a team member at login. Harmless when there is no invitation.
  acceptInvites(): Promise<void>;
  fetchMyRole(shopId: string, userId: string): Promise<RemoteRole>;
  // Server time minus this phone's time, in milliseconds (null = cannot tell)
  clockOffset(): Promise<number | null>;
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

// Columns added by migration 0005. A server that has not run it yet does not know them: then they are left out
// and the rest of the row still goes (the same cancel without its reason is better than a stuck entry).
const NEWER_COLUMNS = ['cancel_reason', 'reason', 'method'];
const missingColumn = (error: NonNullable<PgError>) => error.code === '42703' || error.code === 'PGRST204';

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async upsert(table, rows, options) {
      if (rows.length === 0) return;
      const send = (data: RemoteRow[]) => client.from(table).upsert(data, { onConflict: 'id', ignoreDuplicates: options?.ignoreDuplicates ?? false });
      let { error, status } = await send(rows);
      if (error && missingColumn(error) && rows.some((r) => NEWER_COLUMNS.some((c) => c in r))) {
        ({ error, status } = await send(rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !NEWER_COLUMNS.includes(k))))));
      }
      if (error) fail(error, status);
    },

    async fetchMyShop(userId) {
      // Row-level security already limits this to the shops this login may see (its own, or the one it works in)
      const { data, error, status } = await client.from('shops').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (error) fail(error, status);
      void userId;
      return (data as RemoteRow | null) ?? null;
    },

    async acceptInvites() {
      const { error, status } = await client.rpc('accept_my_invites');
      // 42883 / PGRST202: the function does not exist (migration 0005 not run): nothing to accept
      if (error && error.code !== '42883' && error.code !== 'PGRST202') fail(error, status);
    },

    async fetchMyRole(shopId, userId) {
      const { data, error, status } = await client.from('shop_members').select('role, active').eq('shop_id', shopId).eq('user_id', userId).maybeSingle();
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') return 'unknown'; // table missing: migration 0005 not run
        fail(error, status);
      }
      if (!data) return 'unknown';
      const row = data as { role: string; active: boolean };
      if (!row.active) return 'revoked';
      return row.role === 'owner' || row.role === 'manager' || row.role === 'cashier' ? row.role : 'unknown';
    },

    async clockOffset() {
      const before = Date.now();
      const { data, error } = await client.rpc('server_time');
      const after = Date.now();
      if (error || typeof data !== 'string') return null;
      return Date.parse(data) - (before + after) / 2;
    },

    async fetchRows(table, shopId, since) {
      // audit_log has no updated_at (rows are never changed), the others do (after migration 0003)
      const timeColumn = table === 'audit_log' ? 'created_at' : 'updated_at';
      // The server writes its own diary lines too (origin = 'server', migration 0005). The phone keeps its own lines, so only those are fetched.
      let phoneDiaryOnly = table === 'audit_log';
      const read = async (useSince: boolean): Promise<RemoteRow[] | null> => {
        const rows: RemoteRow[] = [];
        for (let from = 0; ; from += PAGE) {
          let query = client.from(table).select('*').eq('shop_id', shopId);
          if (useSince && since) query = query.gte(timeColumn, since);
          if (phoneDiaryOnly) query = query.eq('origin', 'phone');
          const { data, error, status } = await query.order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, from + PAGE - 1);
          if (error) {
            // Migration 0003 not run yet: the column does not exist
            if (error.code === '42703' && phoneDiaryOnly) {
              phoneDiaryOnly = false; // migration 0005 not run yet: there is no 'origin' column, every line is the phone's
              return read(useSince);
            }
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
