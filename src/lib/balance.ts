// Balance = what the customer owes ("Lene hain"). Always worked out from entries,
// never stored. Pure functions: same input, same answer, no database.
//
//   balance = opening + diye - mile
//
// Cancelled and draft entries are ignored. Other kinds (kharcha, cash_sale, opening)
// do not change a customer's balance. The starting amount lives in party.opening_balance.
// A negative balance means the customer paid more than they owed (advance).

type BalanceEntry = { party_id: string | null; kind: string; amount: number; status: string };

export function partyBalance(openingBalance: number, entries: readonly BalanceEntry[]): number {
  let balance = openingBalance;
  for (const e of entries) {
    if (e.status !== 'active') continue;
    if (e.kind === 'diye') balance += e.amount;
    else if (e.kind === 'mile') balance -= e.amount;
  }
  return balance;
}

// Balance of every person in one pass: { partyId: balance }
export function balancesByParty(
  parties: readonly { id: string; opening_balance: number }[],
  entries: readonly BalanceEntry[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of parties) result[p.id] = p.opening_balance;
  for (const e of entries) {
    if (e.status !== 'active' || e.party_id === null || !(e.party_id in result)) continue;
    if (e.kind === 'diye') result[e.party_id] += e.amount;
    else if (e.kind === 'mile') result[e.party_id] -= e.amount;
  }
  return result;
}
