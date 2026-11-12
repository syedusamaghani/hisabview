// A pretend server for tests. It follows the same rules as our real Supabase database
// (supabase/migrations 0001 to 0003), so the sync engine can be tried without internet:
//  - one shop per login, rows must belong to a shop that exists
//  - a saved entry is frozen (amount, person, kind, date); it can only be cancelled; cancelled is final
//  - the audit diary is add-only
//  - "updated_at" is stamped by the server (like the trigger in migration 0003)
// Not used by the app itself.
import { RemoteError, type LogTable, type Remote, type RemoteRole, type RemoteRow, type SyncTable } from './remote';

export type FakeServer = Remote & {
  tables: Record<SyncTable, Map<string, RemoteRow>>;
  logs: Record<LogTable, Map<string, RemoteRow>>; // feedback and error reports
  offline: boolean; // true = every call fails like a missing internet connection
  supportsUpdatedAt: boolean; // false = migration 0003 was not run
  supportsStock: boolean; // false = migration 0006 was not run (no products and stock_moves tables)
  supportsCash: boolean; // false = migration 0007 was not run (no cash_closings table)
  calls: { op: string; table?: SyncTable | LogTable; rows?: number }[];
  // people who work in this shop without owning it: { loginId: { shopId, role } }
  team: Record<string, { shopId: string; role: RemoteRole }>;
  clockOffsetMs: number | null; // what clockOffset() answers
  // the server refuses every row for which this is true (null = stop refusing)
  refuseRows: (predicate: ((table: SyncTable, row: RemoteRow) => boolean) | null) => void;
};

const reject = (message: string, code: string) => new RemoteError('rejected', message, code);

export function createFakeServer(userId: string): FakeServer {
  const tables: Record<SyncTable, Map<string, RemoteRow>> = { shops: new Map(), parties: new Map(), entries: new Map(), audit_log: new Map(), products: new Map(), stock_moves: new Map(), cash_closings: new Map() };
  const logs: Record<LogTable, Map<string, RemoteRow>> = { feedback: new Map(), error_log: new Map() };
  let clock = Date.parse('2026-11-04T00:00:00Z');
  const stamp = () => new Date((clock += 1000)).toISOString().replace('Z', '+00:00'); // Postgres style
  let refuse: ((table: SyncTable, row: RemoteRow) => boolean) | null = null;

  const server: FakeServer = {
    tables,
    logs,
    offline: false,
    supportsUpdatedAt: true,
    supportsStock: true,
    supportsCash: true,
    calls: [],
    team: {},
    clockOffsetMs: 0,
    refuseRows(predicate) {
      refuse = predicate;
    },

    async upsert(table, rows, options) {
      server.calls.push({ op: 'upsert', table, rows: rows.length });
      if (server.offline) throw new RemoteError('network', 'Failed to fetch');
      if (table === 'feedback' || table === 'error_log') {
        // add-only tables: a person can add a row about themselves, nothing else
        const staged = new Map(logs[table]);
        for (const raw of rows) {
          if (raw.user_id !== userId) throw reject('row violates row-level security policy', '42501');
          if (refuse?.(table as never, raw)) throw reject('refused for the test', '23514');
          if (staged.has(raw.id as string)) {
            if (options?.ignoreDuplicates) continue;
            throw reject('duplicate key', '23505');
          }
          if (table === 'feedback' && (!['problem', 'idea', 'thanks'].includes(raw.kind as string) || String(raw.message ?? '').trim().length === 0)) throw reject('check constraint', '23514');
          staged.set(raw.id as string, { ...raw });
        }
        logs[table] = staged;
        return;
      }
      if ((table === 'products' || table === 'stock_moves') && !server.supportsStock) throw new RemoteError('missing', 'relation does not exist', '42P01');
      if (table === 'cash_closings' && !server.supportsCash) throw new RemoteError('missing', 'relation does not exist', '42P01');
      const staged = new Map(tables[table]);
      for (const raw of rows) {
        if (refuse?.(table, raw)) throw reject('refused for the test', '23514');
        const row = { ...raw };
        const id = row.id as string;
        const old = staged.get(id);
        if (table === 'audit_log') {
          if (old) {
            if (options?.ignoreDuplicates) continue;
            throw reject('no update rule on audit_log', '42501');
          }
          if (!tables.shops.has(row.shop_id as string)) throw reject('shop missing', '23503');
        }
        if (table === 'shops') {
          if (row.owner_user_id !== userId) throw reject('row violates row-level security policy', '42501');
          const other = [...staged.values()].find((s) => s.owner_user_id === row.owner_user_id && s.id !== id);
          if (other) throw reject('duplicate key value violates unique constraint (owner_user_id)', '23505');
        }
        if (table === 'stock_moves') {
          if (old) {
            if (options?.ignoreDuplicates) continue;
            throw reject('stock movements cannot be changed', '42501');
          }
          if (!tables.products.has(row.product_id as string)) throw reject('product missing', '23503');
          if (!Number.isInteger(row.qty_base) || row.qty_base === 0) throw reject('check constraint: qty_base', '23514');
        }
        if (table === 'cash_closings') {
          if (old) {
            if (options?.ignoreDuplicates) continue;
            throw reject('a cash closing cannot be changed', '42501');
          }
          if (row.difference !== (row.counted_cash as number) - (row.expected_cash as number)) throw reject('check constraint: difference', '23514');
          if (server.team[userId]?.role === 'cashier') throw reject('row violates row-level security policy', '42501');
        }
        if (table === 'parties' || table === 'entries' || table === 'products' || table === 'stock_moves' || table === 'cash_closings') {
          const mine = tables.shops.get(row.shop_id as string)?.owner_user_id === userId || server.team[userId]?.shopId === row.shop_id;
          if (!tables.shops.has(row.shop_id as string) || !mine) throw reject('shop missing or not yours', '23503');
        }
        if (table === 'parties' && old && old.shop_id !== row.shop_id) throw reject('party moved shop', '23503');
        if (table === 'entries') {
          if (['withdrawal', 'deposit'].includes(row.kind as string) && (row.party_id || (row.method && row.method !== 'cash'))) throw reject('check constraint: drawer rules', '23514');
          if (row.category && row.kind !== 'kharcha') throw reject('check constraint: category only on kharcha', '23514');
          if (['withdrawal', 'deposit'].includes(row.kind as string) && server.team[userId]?.role === 'cashier') throw reject('A cashier cannot take cash out or put it in', '42501');
          if (['diye', 'mile', 'opening'].includes(row.kind as string) && !row.party_id) throw reject('check constraint: person required', '23514');
          if (row.party_id && !tables.parties.has(row.party_id as string)) throw reject('party missing', '23503');
          if ((row.status === 'cancelled') !== (row.cancelled_at !== null && row.cancelled_at !== undefined)) throw reject('check constraint: cancelled_at', '23514');
          if (old) {
            for (const f of ['shop_id', 'party_id', 'kind', 'amount', 'created_by', 'created_at']) {
              if (JSON.stringify(old[f] ?? null) !== JSON.stringify(row[f] ?? null) && !(f === 'created_at' && Date.parse(old.created_at as string) === Date.parse(row.created_at as string))) {
                throw reject('A saved entry cannot be changed. Cancel it and add a new one.', 'P0001');
              }
            }
            if (old.status === 'cancelled' && row.status !== 'cancelled') throw reject('A cancelled entry cannot be brought back.', 'P0001');
          }
        }
        const stored: RemoteRow = { ...row, created_at: typeof row.created_at === 'string' ? (row.created_at as string).replace('Z', '+00:00') : row.created_at };
        if (typeof stored.cancelled_at === 'string') stored.cancelled_at = (stored.cancelled_at as string).replace('Z', '+00:00');
        if (table !== 'audit_log' && table !== 'stock_moves' && table !== 'cash_closings' && server.supportsUpdatedAt) stored.updated_at = stamp();
        staged.set(id, stored);
      }
      tables[table] = staged; // all or nothing, like one request
    },

    async fetchMyShop(uid) {
      server.calls.push({ op: 'fetchMyShop' });
      if (server.offline) throw new RemoteError('network', 'Failed to fetch');
      const shop = [...tables.shops.values()].find((s) => s.owner_user_id === uid || s.id === server.team[uid]?.shopId);
      return shop ? { ...shop } : null;
    },

    async acceptInvites() {
      server.calls.push({ op: 'acceptInvites' });
      if (server.offline) throw new RemoteError('network', 'Failed to fetch');
    },

    async fetchMyRole(_shopId, uid) {
      server.calls.push({ op: 'fetchMyRole' });
      if (server.offline) throw new RemoteError('network', 'Failed to fetch');
      return server.team[uid]?.role ?? 'owner';
    },

    async clockOffset() {
      if (server.offline) throw new RemoteError('network', 'Failed to fetch');
      return server.clockOffsetMs;
    },

    async fetchRows(table, shopId, since) {
      server.calls.push({ op: 'fetchRows', table });
      if (server.offline) throw new RemoteError('network', 'Failed to fetch');
      if ((table === 'products' || table === 'stock_moves') && !server.supportsStock) throw new RemoteError('missing', 'relation does not exist', '42P01');
      if (table === 'cash_closings' && !server.supportsCash) throw new RemoteError('missing', 'relation does not exist', '42P01');
      const addOnly = table === 'audit_log' || table === 'stock_moves' || table === 'cash_closings';
      const timeColumn = addOnly ? 'created_at' : 'updated_at';
      const useSince = since !== null && (addOnly || server.supportsUpdatedAt);
      return [...tables[table].values()]
        .filter((r) => r.shop_id === shopId)
        .filter((r) => !useSince || Date.parse(r[timeColumn] as string) >= Date.parse(since as string))
        .map((r) => {
          const copy = { ...r };
          if (!server.supportsUpdatedAt) delete copy.updated_at;
          return copy;
        });
    },
  };
  return server;
}
