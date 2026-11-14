// The sync engine. The phone is the boss: every change is saved on the phone first, marked
// pending_sync = 1, and this engine sends it to the server whenever there is internet.
// Sending the same row twice is harmless (same id), and nothing is ever deleted.
//
//  push: send pending rows, in an order the server accepts (shop, customers, entries, diary)
//  pull: bring changes from the server (another phone, or a new phone), never overwriting a
//        change that is still waiting on this phone, and never un-cancelling an entry
import { liveQuery } from 'dexie';
import type { Table } from 'dexie';
import { outbox } from '../../lib/outbox';
import { attachShop, requireUser } from '../context';
import { db } from '../db';
import { reportError } from '../../lib/report';
import { storeMemberShop, storeRole } from '../roleStore';
import { applyEntryChange, recomputeStat, statsRepo } from '../statsRepo';
import { productsRepo } from '../productsRepo';
import type { Entry, Party, Product, Shop, AuditRow } from '../types';
import { ADD_ONLY, changeTime, fromRemote, sameRow, toRemote } from './mapping';
import { CASH_TABLES, RemoteError, STOCK_TABLES, type Remote, type SyncTable } from './remote';
import { getSyncState, setSyncState } from './status';

const PUSH_ORDER: SyncTable[] = ['shops', 'parties', 'entries', 'audit_log'];
const PULL_ORDER = ['parties', 'entries', 'audit_log'] as const;
// Products and stock movements (migration 0006) go after everything else: a server without them must never hold back the khata
const STOCK_PULL = ['products', 'stock_moves'] as const;
// The daily cash closing (migration 0007) is its own optional group too: a server with 0006 but not 0007 must still sync stock
const CASH_PULL = ['cash_closings'] as const;
type PullTable = (typeof PULL_ORDER)[number] | (typeof STOCK_PULL)[number] | (typeof CASH_PULL)[number];
type Group = 'stock' | 'cash';
const BATCH = 100;
// While the app is on screen it asks the server for news about once a minute, so an owner who is away sees a cashier's
// sale within about a minute (changes are incremental when migration 0003 is run). In the background: every 5 minutes.
const PULL_EVERY_MS = 45_000;
const PULL_EVERY_HIDDEN_MS = 5 * 60_000;
const pullEvery = () => (typeof document !== 'undefined' && document.visibilityState === 'hidden' ? PULL_EVERY_HIDDEN_MS : PULL_EVERY_MS);
const NORMAL_RETRY_MS = 60_000;

// A way to treat the four tables the same
type AnyRow = { id: string; pending_sync: number } & Record<string, unknown>;
const tableOf = (name: SyncTable) => db[name] as unknown as Table<AnyRow, string>;

export type SyncResult = 'ok' | 'offline' | 'problem' | 'skipped';
export type RestoreResult = 'restored' | 'none' | 'offline' | 'error';

export function createSync(getRemote: () => Promise<Remote | null>) {
  const blocked = new Set<string>(); // rows the server refused (this session)
  const missing = new Set<Group>(); // optional tables the server does not have yet (this session): stock = migration 0006, cash = 0007
  let running: Promise<SyncResult> | null = null;
  let again = false;

  // ---------- counting what still has to go

  async function totalPending(): Promise<number> {
    let n = 0;
    const tables = [...PUSH_ORDER, ...(missing.has('stock') ? [] : STOCK_TABLES), ...(missing.has('cash') ? [] : CASH_TABLES)];
    for (const t of tables) n += await tableOf(t).where('pending_sync').equals(1).count();
    return n;
  }

  // Run a step that needs an optional group of tables. If the server does not have them, remember it and carry on without.
  async function groupStep(group: Group, run: () => Promise<unknown>): Promise<void> {
    if (missing.has(group)) return;
    try {
      await run();
    } catch (e) {
      if (e instanceof RemoteError && e.kind === 'missing') missing.add(group);
      else throw e;
    }
  }

  async function refreshCounts() {
    const total = await totalPending();
    setSyncState({ pending: Math.max(0, total - blocked.size), blocked: Math.min(blocked.size, total) });
  }

  // ---------- push

  // Only mark a row as sent if it did not change while it was travelling
  async function markSynced(table: SyncTable, sent: AnyRow[]) {
    const t = tableOf(table);
    await db.transaction('rw', t, async () => {
      for (const row of sent) {
        const now = await t.get(row.id);
        if (now && now.pending_sync === 1 && sameRow(table, now, row)) await t.update(row.id, { pending_sync: 0 });
      }
    });
  }

  async function sendBatch(remote: Remote, table: SyncTable, rows: AnyRow[]) {
    await remote.upsert(table, rows.map((r) => toRemote(table, r)), { ignoreDuplicates: ADD_ONLY.includes(table) });
    await markSynced(table, rows);
  }

  async function pushTable(remote: Remote, table: SyncTable) {
    const rows = (await tableOf(table).where('pending_sync').equals(1).toArray()).filter((r) => !blocked.has(r.id));
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      try {
        await sendBatch(remote, table, chunk);
      } catch (e) {
        if (!(e instanceof RemoteError) || e.kind !== 'rejected') throw e;
        // The server refused something in this batch. Find which row, so the others still go.
        for (const row of chunk) {
          try {
            await sendBatch(remote, table, [row]);
          } catch (inner) {
            if (inner instanceof RemoteError && inner.kind === 'rejected') blocked.add(row.id);
            else throw inner;
          }
        }
      }
    }
  }

  // A phone that never reached the server may hold its own shop, while the server already has one
  // for this login (made on another phone). One shop per login: keep the server's, and move this
  // phone's customers and entries into it. Nothing is lost.
  async function reconcileShop(remote: Remote, userId: string) {
    const local = await db.shops.where('owner_user_id').equals(userId).first();
    if (!local || local.pending_sync !== 1) return;
    const theirs = await remote.fetchMyShop(userId);
    if (!theirs || theirs.id === local.id) return;
    const adopted = fromRemote<Shop>('shops', theirs);
    await db.transaction('rw', [db.shops, db.parties, db.entries, db.audit_log, db.party_stats, db.products, db.stock_moves, db.product_stats, db.cash_closings], async () => {
      for (const t of ['parties', 'entries', 'audit_log', 'products', 'stock_moves', 'cash_closings'] as const) {
        await tableOf(t).where('shop_id').equals(local.id).modify({ shop_id: adopted.id, pending_sync: 1 });
      }
      await db.party_stats.where('shop_id').equals(local.id).modify({ shop_id: adopted.id });
      await db.product_stats.where('shop_id').equals(local.id).modify({ shop_id: adopted.id });
      await db.shops.delete(local.id);
      await db.shops.put(adopted);
    });
    attachShop(adopted.id);
  }

  // ---------- pull

  async function cursor(table: SyncTable): Promise<string | null> {
    return (await db.sync_meta.get(`pull:${table}`))?.value ?? null;
  }

  async function mergeShop(remote: Record<string, unknown>) {
    const incoming = fromRemote<Shop>('shops', remote);
    const local = await db.shops.get(incoming.id);
    if (!local || local.pending_sync !== 1) await db.shops.put(incoming);
  }

  function mergeParty(local: Party | undefined, incoming: Party): Party | null {
    if (!local) return incoming;
    return local.pending_sync === 1 ? null : incoming; // a change waiting on this phone wins
  }

  // Cancelled is final: if either side cancelled it, it is cancelled. Returns the row to keep, or null to leave the phone's row alone.
  function mergeEntry(local: Entry | undefined, incoming: Entry): Entry | null {
    if (!local) return incoming;
    if (incoming.status === 'cancelled' && local.status !== 'cancelled') return incoming; // the server knows it was cancelled
    if (local.status === 'cancelled') return null; // cancelled here: keep it (it is sent if still pending)
    return local.pending_sync === 1 ? null : incoming;
  }

  // What to keep for one incoming row: the row to write, or null to leave the phone's row alone
  function decide(table: PullTable, local: AnyRow | undefined, incoming: AnyRow): AnyRow | null {
    if (table === 'parties') return mergeParty(local as unknown as Party | undefined, incoming as unknown as Party) as AnyRow | null;
    if (table === 'products') return (local?.pending_sync === 1 ? null : incoming) as Product | null as AnyRow | null; // a change waiting on this phone wins
    if (table === 'entries') return mergeEntry(local as unknown as Entry | undefined, incoming as unknown as Entry) as AnyRow | null;
    return local ? null : incoming; // the diary is add-only
  }

  async function pullTable(remote: Remote, table: PullTable, shopId: string, fresh: boolean): Promise<number> {
    const since = fresh ? null : await cursor(table);
    const rows = await remote.fetchRows(table, shopId, since);
    const t = tableOf(table);
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      // The customer summaries (party_stats) are updated in the same transaction as the rows they come from
      await db.transaction('rw', [db.parties, db.entries, db.audit_log, db.party_stats, db.products, db.stock_moves, db.cash_closings], async () => {
        if (fresh) {
          // A fresh phone: write the whole chunk at once (fast). The summaries are rebuilt afterwards.
          const incomings = chunk.map((raw) => fromRemote<AnyRow>(table, raw));
          const locals = await t.bulkGet(incomings.map((r) => r.id));
          const keep: AnyRow[] = [];
          incomings.forEach((incoming, n) => {
            const next = decide(table, locals[n], incoming);
            if (next) keep.push(next);
          });
          await t.bulkPut(keep);
          return;
        }
        for (const raw of chunk) {
          const incoming = fromRemote<AnyRow>(table, raw);
          const local = await t.get(incoming.id);
          const next = decide(table, local, incoming);
          if (!next) continue;
          await t.put(next);
          if (table === 'parties') await recomputeStat(next as unknown as Party);
          if (table === 'entries') {
            const entry = next as unknown as Entry;
            const party = entry.party_id ? await db.parties.get(entry.party_id) : undefined;
            if (party) await applyEntryChange(party, local as unknown as Entry | undefined, entry);
          }
        }
      });
    }
    // Remember how far we got. A server without "updated_at" gives no time, so next time is a full download.
    const times = rows.map((r) => changeTime(table, r)).filter((v): v is string => v !== null);
    if (times.length > 0) await db.sync_meta.put({ key: `pull:${table}`, value: times.reduce((a, b) => (a > b ? a : b)) });
    else if (rows.length > 0) await db.sync_meta.delete(`pull:${table}`);
    return rows.length;
  }

  // Which role this login has, kept on the phone (a person who works in somebody else's shop also keeps WHICH shop)
  async function rememberMembership(remote: Remote, userId: string, shop: Record<string, unknown>) {
    if (shop.owner_user_id !== userId) await storeMemberShop(userId, shop.id as string);
    const role = await remote.fetchMyRole(shop.id as string, userId);
    if (role !== 'unknown') await storeRole(userId, role);
  }

  // The customer summaries are a shortcut that can always be worked out again from the entries. After new rows
  // arrive, check they still agree, and quietly fix them (and tell us) if they ever do not.
  async function checkBalances(shopId: string) {
    const wrong = await statsRepo.verify(shopId);
    if (wrong.length === 0) return;
    await statsRepo.rebuildAll(shopId);
    reportError(new Error(`balance summary was wrong for ${wrong.length} customer(s) and was rebuilt`), 'sync');
  }

  async function pullAll(remote: Remote, userId: string, fresh = false) {
    const shop = await remote.fetchMyShop(userId);
    if (!shop) return;
    let arrived = 0;
    for (const table of PULL_ORDER) arrived += await pullTable(remote, table, shop.id as string, fresh);
    let stockArrived = 0;
    await groupStep('stock', async () => {
      for (const table of STOCK_PULL) stockArrived += await pullTable(remote, table, shop.id as string, fresh);
    });
    await groupStep('cash', async () => {
      for (const table of CASH_PULL) await pullTable(remote, table, shop.id as string, fresh);
    });
    if (stockArrived > 0) await productsRepo.rebuildStats(shop.id as string); // the stock of each product = the sum of its movements
    await mergeShop(shop);
    await rememberMembership(remote, userId, shop);
    if (arrived > 0) await checkBalances(shop.id as string);
  }

  // ---------- one round of syncing

  function classify(e: unknown): SyncResult {
    if (e instanceof RemoteError) return e.kind === 'rejected' ? 'problem' : 'offline';
    console.warn('sync: unexpected problem', e);
    return 'offline'; // anything unexpected: keep the data, try again later
  }

  async function runOnce(withPull: boolean): Promise<SyncResult> {
    const remote = await getRemote();
    if (!remote) return 'skipped';
    const userId = requireUser();
    setSyncState({ phase: 'syncing' });
    try {
      await reconcileShop(remote, userId);
      for (const table of PUSH_ORDER) await pushTable(remote, table);
      await groupStep('stock', async () => {
        for (const table of STOCK_TABLES) await pushTable(remote, table);
      });
      await groupStep('cash', async () => {
        for (const table of CASH_TABLES) await pushTable(remote, table);
      });
      if (withPull) {
        await pullAll(remote, userId);
        const offset = await remote.clockOffset();
        if (offset !== null) setSyncState({ clockOffsetMs: Math.round(offset) });
      }
      await refreshCounts();
      const left = getSyncState();
      setSyncState({ phase: left.blocked > 0 ? 'problem' : 'idle', lastSyncAt: left.pending === 0 && left.blocked === 0 ? new Date().toISOString() : left.lastSyncAt });
      return left.blocked > 0 ? 'problem' : 'ok';
    } catch (e) {
      const result = classify(e);
      await refreshCounts();
      setSyncState({ phase: result === 'problem' ? 'problem' : 'offline' });
      return result;
    }
  }

  // Only one round at a time. If something changes meanwhile, one more round follows.
  function syncNow(options: { pull?: boolean } = {}): Promise<SyncResult> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      let result = await runOnce(options.pull ?? false);
      while (again) {
        again = false;
        result = await runOnce(false);
      }
      return result;
    })().finally(() => {
      running = null;
    });
    return running;
  }

  // Feedback and error reports waiting in the outbox go to our tables when there is internet and a login.
  // Sent with ignore-duplicates, so a lost answer never makes a report twice.
  async function flushOutbox(): Promise<void> {
    if (outbox.size() === 0) return;
    const remote = await getRemote();
    if (!remote) return;
    let userId: string;
    try {
      userId = requireUser();
    } catch {
      return; // not logged in: they wait
    }
    for (const table of ['feedback', 'error_log'] as const) {
      const items = outbox.all().filter((i) => i.table === table);
      if (items.length === 0) continue;
      const rows = items.map((i) => ({ ...i.row, id: i.id, user_id: userId }));
      try {
        await remote.upsert(table, rows, { ignoreDuplicates: true });
        outbox.remove(items.map((i) => i.id));
      } catch (e) {
        if (!(e instanceof RemoteError) || e.kind !== 'rejected') return; // no internet: keep them
        // The server refused something: find the bad ones, drop only those (a refused report can never succeed)
        for (const [n, row] of rows.entries()) {
          try {
            await remote.upsert(table, [row], { ignoreDuplicates: true });
            outbox.remove([items[n].id]);
          } catch (inner) {
            if (inner instanceof RemoteError && inner.kind === 'rejected') outbox.remove([items[n].id]);
            else return;
          }
        }
      }
    }
  }

  // New phone, same login: bring everything back from the server. Called before onboarding so a
  // second shop is never made by mistake.
  async function restore(): Promise<RestoreResult> {
    const remote = await getRemote();
    if (!remote) return 'error';
    try {
      const userId = requireUser();
      // Somebody invited by the owner becomes a team member now, before we look for their shop
      try {
        await remote.acceptInvites();
      } catch (e) {
        if (!(e instanceof RemoteError) || e.kind !== 'rejected') throw e;
      }
      const shop = await remote.fetchMyShop(userId);
      if (!shop) return 'none';
      await db.sync_meta.clear();
      for (const table of PULL_ORDER) await pullTable(remote, table, shop.id as string, true);
      await groupStep('stock', async () => {
        for (const table of STOCK_PULL) await pullTable(remote, table, shop.id as string, true);
      });
      await groupStep('cash', async () => {
        for (const table of CASH_PULL) await pullTable(remote, table, shop.id as string, true);
      });
      await productsRepo.rebuildStats(shop.id as string);
      await statsRepo.rebuildAll(shop.id as string); // a fresh phone: work every balance out again from the entries
      await rememberMembership(remote, userId, shop);
      await mergeShop(shop); // last, so the app opens only when everything is in
      setSyncState({ lastSyncAt: new Date().toISOString() });
      return 'restored';
    } catch (e) {
      return e instanceof RemoteError && e.kind === 'rejected' ? 'error' : 'offline';
    }
  }

  // Keeps syncing while the app is open. Returns a function that stops it.
  function start(): () => void {
    let stopped = false;
    let timer: number | undefined;
    let debounce: number | undefined;
    let failures = 0;
    let lastPull = 0;

    const schedule = () => {
      window.clearTimeout(timer);
      const delay = failures > 0 ? Math.min(5 * 60_000, 5_000 * 2 ** (failures - 1)) : NORMAL_RETRY_MS;
      timer = window.setTimeout(() => void run(), delay);
    };
    const run = async (forcePull = false) => {
      if (stopped) return;
      const due = forcePull || Date.now() - lastPull > pullEvery();
      const result = await syncNow({ pull: due });
      await flushOutbox().catch(() => undefined);
      if (stopped) return;
      if (result === 'ok' && due) lastPull = Date.now();
      failures = result === 'offline' ? failures + 1 : 0;
      schedule();
    };

    const onOnline = () => {
      failures = 0;
      void run(true);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    // New changes on the phone start a round a moment later (several quick saves go together)
    const watching = liveQuery(totalPending).subscribe({
      next: (n) => {
        setSyncState({ pending: Math.max(0, n - blocked.size), blocked: Math.min(blocked.size, n) });
        if (n - blocked.size > 0 && !running) {
          window.clearTimeout(debounce);
          debounce = window.setTimeout(() => void run(), 1500);
        }
      },
      error: () => undefined,
    });

    void run(true);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.clearTimeout(debounce);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      watching.unsubscribe();
    };
  }

  return { syncNow, restore, start, flushOutbox, blockedCount: () => blocked.size };
}
