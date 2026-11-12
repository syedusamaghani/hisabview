// Balance = what the person owes me ("Lene hain"). Always worked out from entries,
// never stored. Pure functions: same input, same answer, no database.
//
//   balance = old balance + diye - mile
//
//  - positive = they owe me (Lene hain). negative = I owe them (Dene hain).
//  - An 'opening' entry is the old balance. For a customer it counts as "they owe me",
//    for a supplier as "I owe them" (so it counts negative).
//  - purchase (goods bought on a supplier's account) counts negative, purchase_return positive.
//  - Cancelled and draft entries are ignored. kharcha and cash_sale do not touch a balance.
//  - party.opening_balance is an older way to store the starting amount. New data leaves it
//    at 0, but it still counts if it is not 0, so no old record is lost.

type BalanceEntry = { party_id: string | null; kind: string; amount: number; status: string };
type BalanceParty = { type: string; opening_balance: number };

export function effect(entry: BalanceEntry, partyType: string): number {
  if (entry.status !== 'active') return 0;
  if (entry.kind === 'diye') return entry.amount;
  if (entry.kind === 'mile') return -entry.amount;
  // Goods from a supplier: we owe more. Goods sent back: we owe less.
  if (entry.kind === 'purchase') return -entry.amount;
  if (entry.kind === 'purchase_return') return entry.amount;
  if (entry.kind === 'opening') return partyType === 'supplier' ? -entry.amount : entry.amount;
  return 0;
}

export function partyBalance(party: BalanceParty, entries: readonly BalanceEntry[]): number {
  let balance = party.opening_balance;
  for (const e of entries) balance += effect(e, party.type);
  return balance;
}

// Balance of every person in one pass: { partyId: balance }
export function balancesByParty(
  parties: readonly (BalanceParty & { id: string })[],
  entries: readonly BalanceEntry[],
): Record<string, number> {
  const types: Record<string, string> = {};
  const result: Record<string, number> = {};
  for (const p of parties) {
    types[p.id] = p.type;
    result[p.id] = p.opening_balance;
  }
  for (const e of entries) {
    if (e.party_id === null || !(e.party_id in result)) continue;
    result[e.party_id] += effect(e, types[e.party_id]);
  }
  return result;
}

// The two numbers on the home screen
export function totals(balances: Record<string, number>): { leneHain: number; deneHain: number } {
  let leneHain = 0;
  let deneHain = 0;
  for (const b of Object.values(balances)) {
    if (b > 0) leneHain += b;
    else deneHain -= b;
  }
  return { leneHain, deneHain };
}
