import { db } from './db';
import { requireShop, requireUser } from './context';
import { newId, nowIso } from './ids';
import { snapshot, write } from './auditRepo';
import { MAX_AMOUNT, type Entry, type EntryKind, type EntrySource } from './types';

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
    await db.transaction('rw', db.entries, db.parties, db.audit_log, async () => {
      if (entry.party_id) {
        const party = await db.parties.get(entry.party_id);
        if (!party || party.shop_id !== entry.shop_id) throw new Error('Person not found');
      }
      await db.entries.add(entry);
      await write('entry', entry.id, 'create', null, snapshot(entry));
    });
    return entry;
  },

  // "Wapas lo" / cancel. The entry stays in the database, marked cancelled.
  async cancel(id: string): Promise<Entry> {
    return db.transaction('rw', db.entries, db.audit_log, async () => {
      const before = await db.entries.get(id);
      if (!before || before.shop_id !== requireShop()) throw new Error('Entry not found');
      if (before.status === 'cancelled') throw new Error('Entry is already cancelled');
      const after: Entry = { ...before, status: 'cancelled', cancelled_at: nowIso(), pending_sync: 1 };
      await db.entries.put(after);
      await write('entry', id, 'cancel', snapshot(before), snapshot(after));
      return after;
    });
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

  // The latest entries of the whole shop, newest first
  async listRecent(limit = 20): Promise<Entry[]> {
    const rows = await db.entries.where('shop_id').equals(requireShop()).toArray();
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  },

  // All entries of the shop. Used to work out balances.
  async listAll(): Promise<Entry[]> {
    return db.entries.where('shop_id').equals(requireShop()).toArray();
  },
};
