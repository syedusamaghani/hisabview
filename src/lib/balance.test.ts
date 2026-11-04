import { describe, expect, it } from 'vitest';
import { balancesByParty, partyBalance, totals } from './balance';

const e = (kind: string, amount: number, status = 'active', party_id: string | null = 'ali') => ({ party_id, kind, amount, status });
const customer = (opening_balance = 0) => ({ type: 'customer', opening_balance });
const supplier = (opening_balance = 0) => ({ type: 'supplier', opening_balance });

describe('partyBalance', () => {
  it('is 0 for a new customer with no entries', () => {
    expect(partyBalance(customer(), [])).toBe(0);
  });

  it('adds diye and subtracts mile', () => {
    // Gave 2,500 of goods, received 1,200 => 1,300
    expect(partyBalance(customer(), [e('diye', 2500), e('mile', 1200)])).toBe(1300);
  });

  it('counts an opening entry as "they owe me" for a customer', () => {
    // Old balance 1,000. Gave 2,500. Received 1,200. => 2,300
    expect(partyBalance(customer(), [e('opening', 1000), e('diye', 2500), e('mile', 1200)])).toBe(2300);
  });

  it('counts an opening entry as "I owe them" for a supplier', () => {
    expect(partyBalance(supplier(), [e('opening', 8000)])).toBe(-8000);
    // I paid the supplier 3,000 (diye), so I still owe 5,000
    expect(partyBalance(supplier(), [e('opening', 8000), e('diye', 3000)])).toBe(-5000);
  });

  it('ignores cancelled entries, including a cancelled opening entry', () => {
    expect(partyBalance(customer(), [e('diye', 800), e('diye', 5000, 'cancelled')])).toBe(800);
    expect(partyBalance(customer(), [e('diye', 800), e('mile', 800, 'cancelled')])).toBe(800);
    expect(partyBalance(customer(), [e('opening', 4000, 'cancelled'), e('diye', 100)])).toBe(100);
  });

  it('ignores draft entries', () => {
    expect(partyBalance(customer(), [e('diye', 300), e('diye', 700, 'draft')])).toBe(300);
  });

  it('gives 0 when the customer has paid everything', () => {
    expect(partyBalance(customer(), [e('opening', 500), e('diye', 1500), e('mile', 2000)])).toBe(0);
  });

  it('goes negative when the customer paid in advance', () => {
    expect(partyBalance(customer(), [e('diye', 200), e('mile', 1000)])).toBe(-800);
  });

  it('does not depend on the order of entries', () => {
    const list = [e('mile', 400), e('diye', 1000), e('opening', 250), e('mile', 100)];
    expect(partyBalance(customer(), list)).toBe(750);
    expect(partyBalance(customer(), [...list].reverse())).toBe(750);
  });

  it('does not count kharcha or cash_sale entries', () => {
    expect(partyBalance(customer(), [e('kharcha', 900, 'active', null), e('cash_sale', 400, 'active', null)])).toBe(0);
  });

  it('still counts an older opening_balance on the person', () => {
    expect(partyBalance(customer(1500), [e('diye', 500)])).toBe(2000);
  });

  it('handles a busy month of chai-stall udhaar', () => {
    const month = [
      e('opening', 250), e('diye', 120), e('diye', 80), e('diye', 150), e('mile', 200), e('diye', 60),
      e('diye', 90, 'cancelled'), e('diye', 110), e('mile', 100), e('diye', 40),
    ];
    // 120+80+150+60+110+40 = 560 given, 300 received
    expect(partyBalance(customer(), month)).toBe(250 + 560 - 300);
  });

  it('handles the biggest amounts (9 digits) without losing a rupee', () => {
    expect(partyBalance(customer(), [e('opening', 999_999_999), e('diye', 999_999_999), e('mile', 1)])).toBe(1_999_999_997);
  });
});

describe('balancesByParty', () => {
  const parties = [
    { id: 'ali', ...customer(1000) },
    { id: 'ali2', ...customer() },
    { id: 'bilal', ...customer(-200) },
    { id: 'dealer', ...supplier() },
  ];

  it('works out each person on their own (three Alis stay separate)', () => {
    const entries = [
      e('diye', 500, 'active', 'ali'),
      e('diye', 300, 'active', 'ali2'),
      e('mile', 100, 'active', 'ali2'),
      e('diye', 50, 'active', 'bilal'),
      e('opening', 7000, 'active', 'dealer'),
    ];
    expect(balancesByParty(parties, entries)).toEqual({ ali: 1500, ali2: 200, bilal: -150, dealer: -7000 });
  });

  it('includes people with no entries and skips cancelled ones', () => {
    expect(balancesByParty(parties, [e('diye', 999, 'cancelled', 'ali')])).toEqual({ ali: 1000, ali2: 0, bilal: -200, dealer: 0 });
  });

  it('ignores entries for unknown people and entries without a person', () => {
    const entries = [e('diye', 10, 'active', 'stranger'), e('kharcha', 10, 'active', null)];
    expect(balancesByParty(parties, entries)).toEqual({ ali: 1000, ali2: 0, bilal: -200, dealer: 0 });
  });

  it('matches partyBalance for every person', () => {
    const entries = [e('diye', 70, 'active', 'ali'), e('mile', 20, 'active', 'ali'), e('opening', 5, 'active', 'dealer')];
    const all = balancesByParty(parties, entries);
    for (const p of parties) {
      expect(all[p.id]).toBe(partyBalance(p, entries.filter((x) => x.party_id === p.id)));
    }
  });
});

describe('totals', () => {
  it('splits what I will collect from what I must pay', () => {
    expect(totals({ a: 1500, b: -300, c: 0, d: 200, e: -7000 })).toEqual({ leneHain: 1700, deneHain: 7300 });
  });

  it('is zero for an empty shop', () => {
    expect(totals({})).toEqual({ leneHain: 0, deneHain: 0 });
  });
});
