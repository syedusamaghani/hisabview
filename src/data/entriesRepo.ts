import { db } from './db';
import { requireShop, requireUser } from './context';
import { newId, nowIso } from './ids';
import { snapshot, write } from './auditRepo';
import { applyEntryChange } from './statsRepo';
import { MAX_AMOUNT, type CancelReason, type Entry, type EntryKind, type EntrySource } from './types';

export type NewEntry = {
  kind: EntryKind;
  party_id: string | null;
  amount: number;
  note?: string | null;
  transcript?: string | null;
  source?: EntrySource;
  promise_date?: string | null;
};

export const entriesRepo = {
  async create(input: NewEntry): Promise<Entry> {
    if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > MAX_AMOUNT) throw new Error('Amount is not valid');
    if (['diye', 'mile', 'opening'].includes(input.kind) && !input.party_id) throw new Error('Choose a person');
    const entry: Entry = {
      id: newId(),
      shop_id: requireShop(),
      party_id: input.party_id,
      kind: input.kind,
      amount: input.amount,
      note: input.note?.trim() || null,
      transcript: input.transcript?.trim() || null,
      source: input.source ?? 'manual',
      status: 'active',
      promise_date: input.promise_date ?? null,
      created_by: requireUser(),
      created_at: nowIso(),
      cancelled_at: null,
      pending_sync: 1,
    };
    // The entry, its audit line and the customer's balance summary are saved together, or not at all
    await db.transaction('rw', db.entries, db.parties, db.audit_log, db.party_stats, async () => {
      const party = entry.party_id ? await db.parties.get(entry.party_id) : undefined;
      if (entry.party_id && (!party || party.shop_id !== entry.shop_id)) throw new Error('Person not found');
      await db.entries.add(entry);
      await write('entry', entry.id, 'create', null, snapshot(entry));
      if (party) await applyEntryChange(party, undefined, entry);
    });
    return entry;
  },

  // "Wapas lo" / cancel. The entry stays in the database, marked cancelled.
  async cancel(id: string, reason?: CancelReason): Promise<Entry> {
    return db.transaction('rw', db.entries, db.parties, db.audit_log, db.party_stats, async () => {
      const before = await db.entries.get(id);
      if (!before || before.shop_id !== requireShop()) throw new Error('Entry not found');
      if (before.status === 'cancelled') throw new Error('Entry is already cancelled');
      const after: Entry = { ...before, status: 'cancelled', cancelled_at: nowIso(), ...(reason ? { cancel_reason: reason } : {}), pending_sync: 1 };
      await db.entries.put(after);
      await write('entry', id, 'cancel', snapshot(before), snapshot(after), requireShop(), reason ?? null);
      const party = before.party_id ? await db.parties.get(before.party_id) : undefined;
      if (party) await applyEntryChange(party, before, after);
      return after;
    });
  },

  // The same entry saved a moment ago? (same person, kind and amount, still counting). Used to warn before a
  // double save: a shopkeeper in a rush can write the same Diye twice. Only a warning, saving is still allowed.
  async findRecentDuplicate(input: { kind: EntryKind; party_id: string | null; amount: number }, withinMs = 120_000): Promise<Entry | undefined> {
    const shop = requireShop();
    const since = new Date(Date.now() - withinMs).toISOString();
    const recent = await db.entries.where('created_at').aboveOrEqual(since).toArray();
    return recent.find((e) => e.shop_id === shop && e.status === 'active' && e.kind === input.kind && e.party_id === input.party_id && e.amount === input.amount);
  },

  async get(id: string): Promise<Entry | undefined> {
    const entry = await db.entries.get(id);
    return entry && entry.shop_id === requireShop() ? entry : undefined;
  },

  // Everything for one person, newest first (cancelled ones included, so they can be shown struck out)
  async listForParty(partyId: string): Promise<Entry[]> {
    const rows = await db.entries.where('party_id').equals(partyId).toArray();
    return rows.filter((e) => e.shop_id === requireShop()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  // The latest entries of the whole shop, newest first (reads from the newest end only, not everything)
  async listRecent(limit = 20): Promise<Entry[]> {
    const shop = requireShop();
    return db.entries.orderBy('created_at').reverse().filter((e) => e.shop_id === shop).limit(limit).toArray();
  },

  // The latest Diye and Mile that count (not cancelled), newest first. For the Home list.
  async listRecentMoney(limit = 5): Promise<Entry[]> {
    const shop = requireShop();
    return db.entries
      .orderBy('created_at')
      .reverse()
      .filter((e) => e.shop_id === shop && e.status === 'active' && (e.kind === 'diye' || e.kind === 'mile') && e.party_id !== null)
      .limit(limit)
      .toArray();
  },

  // Entries made at or after this moment (for "Aaj ka hisaab": only today is read, not the whole khata)
  async listSince(iso: string): Promise<Entry[]> {
    const shop = requireShop();
    return db.entries.where('created_at').aboveOrEqual(iso).filter((e) => e.shop_id === shop).toArray();
  },

  // All entries of the shop. Slow on a big khata: screens use statsRepo (balances) and listSince/listRecent instead.
  async listAll(): Promise<Entry[]> {
    return db.entries.where('shop_id').equals(requireShop()).toArray();
  },
};
