// A customer's (or supplier's) account as a ledger: every entry with the balance after it.
// Pure functions. The last balance is always the same number as partyBalance (src/lib/balance.ts), because
// both use the same rule (effect).
//
// Balance above 0 = they owe me (Lene hain). Below 0 = I owe them (Dene hain).
import { effect } from './balance';

type LedgerEntry = { id: string; party_id: string | null; kind: string; amount: number; status: string; created_at: string };
type LedgerParty = { type: string; opening_balance: number };

export type LedgerRow<T extends LedgerEntry> = {
  entry: T;
  balance: number | null; // the balance after this entry; null for a cancelled entry (it changed nothing)
};

// Oldest first, with the running balance. Entries made at the same moment keep their given order.
export function ledgerRows<T extends LedgerEntry>(party: LedgerParty, entries: readonly T[]): LedgerRow<T>[] {
  const sorted = [...entries].filter((e) => e.status !== 'draft').sort((a, b) => a.created_at.localeCompare(b.created_at));
  let balance = party.opening_balance;
  return sorted.map((entry) => {
    if (entry.status !== 'active') return { entry, balance: null };
    balance += effect(entry, party.type);
    return { entry, balance };
  });
}

// Which side of the account an entry is on, for the filter chips: the goods / udhaar side, or the payments side.
// A customer: Diye (udhaar) is goods, Mile is a payment. A supplier: purchases and returns are goods, Diye and Mile are payments.
export type EntryGroup = 'goods' | 'payments';
export function entryGroup(partyType: string, kind: string): EntryGroup {
  if (partyType === 'supplier') return kind === 'diye' || kind === 'mile' ? 'payments' : 'goods';
  return kind === 'mile' ? 'payments' : 'goods';
}
