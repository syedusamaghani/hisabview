import { db } from './db';
import { requireShop } from './context';
import { newId, nowIso } from './ids';
import { snapshot, write } from './auditRepo';
import { entriesRepo } from './entriesRepo';
import { MAX_AMOUNT, type Entry, type Party, type PartyType } from './types';

export type NewParty = {
  name: string;
  identifier?: string | null;
  phone?: string | null;
  type?: PartyType;
  credit_limit?: number | null;
  opening_balance?: number; // older way to store the starting amount. New code leaves it out.
};

// An old balance from before the app ("Purane hisaab"). It is saved as an 'opening' entry.
//  theyOweMe -> a customer (Lene hain)     iOweThem -> a supplier (Dene hain)
export type OpeningBalance = { amount: number; direction: 'theyOweMe' | 'iOweThem' };

export type PartyChanges = Partial<Pick<Party, 'name' | 'identifier' | 'phone' | 'credit_limit' | 'opening_balance' | 'archived'>>;

function check(p: Pick<Party, 'name' | 'opening_balance' | 'credit_limit'>) {
  if (p.name.length < 1 || p.name.length > 80) throw new Error('Name must be 1 to 80 letters');
  if (!Number.isInteger(p.opening_balance) || Math.abs(p.opening_balance) > MAX_AMOUNT) throw new Error('Opening amount is not valid');
  if (p.credit_limit !== null && (!Number.isInteger(p.credit_limit) || p.credit_limit <= 0 || p.credit_limit > MAX_AMOUNT)) {
    throw new Error('Credit limit is not valid');
  }
}

export const partiesRepo = {
  async create(input: NewParty & { opening?: OpeningBalance }): Promise<{ party: Party; opening: Entry | null }> {
    const party: Party = {
      id: newId(),
      shop_id: requireShop(),
      name: input.name.trim(),
      identifier: input.identifier?.trim() || null,
      phone: input.phone?.trim() || null,
      type: input.opening ? (input.opening.direction === 'iOweThem' ? 'supplier' : 'customer') : (input.type ?? 'customer'),
      credit_limit: input.credit_limit ?? null,
      opening_balance: input.opening_balance ?? 0,
      created_at: nowIso(),
      archived: false,
      pending_sync: 1,
    };
    check(party);
    // The person, the old-balance entry and both audit lines are saved together, or not at all
    const opening = await db.transaction('rw', db.parties, db.entries, db.audit_log, async () => {
      await db.parties.add(party);
      await write('party', party.id, 'create', null, snapshot(party));
      if (!input.opening) return null;
      return entriesRepo.create({ kind: 'opening', party_id: party.id, amount: input.opening.amount });
    });
    return { party, opening };
  },

  // Also used to archive (hide) a person. People are never deleted.
  async update(id: string, changes: PartyChanges): Promise<Party> {
    return db.transaction('rw', db.parties, db.audit_log, async () => {
      const before = await db.parties.get(id);
      if (!before || before.shop_id !== requireShop()) throw new Error('Person not found');
      const after: Party = { ...before, ...changes, pending_sync: 1 };
      after.name = after.name.trim();
      check(after);
      await db.parties.put(after);
      await write('party', id, 'edit', snapshot(before), snapshot(after));
      return after;
    });
  },

  archive(id: string) {
    return this.update(id, { archived: true });
  },

  async get(id: string): Promise<Party | undefined> {
    const party = await db.parties.get(id);
    return party && party.shop_id === requireShop() ? party : undefined;
  },

  // Everyone in this shop who is not archived, A to Z
  async listActive(): Promise<Party[]> {
    const all = await db.parties.where('shop_id').equals(requireShop()).toArray();
    return all.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name));
  },
};
