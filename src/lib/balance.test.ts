import { describe, expect, it } from 'vitest';
import { balancesByParty, partyBalance } from './balance';

const e = (kind: string, amount: number, status = 'active', party_id: string | null = 'ali') => ({ party_id, kind, amount, status });

describe('partyBalance', () => {
  it('is 0 for a new customer with no entries', () => {
    expect(partyBalance(0, [])).toBe(0);
  });

  it('starts from the opening amount', () => {
    expect(partyBalance(1500, [])).toBe(1500);
  });

  it('adds diye and subtracts mile', () => {
    // Opening 1,000. Gave 2,500 of goods. Received 1,200. => 2,300
    expect(partyBalance(1000, [e('diye', 2500), e('mile', 1200)])).toBe(2300);
  });

  it('ignores cancelled entries', () => {
    // A wrong Rs 5,000 diye was cancelled, so it must not count
    expect(partyBalance(0, [e('diye', 800), e('diye', 5000, 'cancelled')])).toBe(800);
    expect(partyBalance(0, [e('diye', 800), e('mile', 800, 'cancelled')])).toBe(800);
  });

  it('ignores draft entries', () => {
    expect(partyBalance(0, [e('diye', 300), e('diye', 700, 'draft')])).toBe(300);
  });

  it('gives 0 when the customer has paid everything', () => {
    expect(partyBalance(500, [e('diye', 1500), e('mile', 2000)])).toBe(0);
  });

  it('goes negative when the customer paid in advance', () => {
    expect(partyBalance(0, [e('diye', 200), e('mile', 1000)])).toBe(-800);
  });

  it('does not depend on the order of entries', () => {
    const list = [e('mile', 400), e('diye', 1000), e('diye', 250), e('mile', 100)];
    expect(partyBalance(0, list)).toBe(750);
    expect(partyBalance(0, [...list].reverse())).toBe(750);
  });

  it('does not count kharcha, cash_sale or opening entries', () => {
    expect(partyBalance(100, [e('kharcha', 900, 'active', null), e('cash_sale', 400, 'active', null), e('opening', 777)])).toBe(100);
  });

  it('handles a busy month of chai-stall udhaar', () => {
    const month = [
      e('diye', 120), e('diye', 80), e('diye', 150), e('mile', 200), e('diye', 60),
      e('diye', 90, 'cancelled'), e('diye', 110), e('mile', 100), e('diye', 40),
    ];
    // 120+80+150+60+110+40 = 560 given, 300 received
    expect(partyBalance(250, month)).toBe(250 + 560 - 300);
  });

  it('handles the biggest amounts (9 digits) without losing a rupee', () => {
    expect(partyBalance(999_999_999, [e('diye', 999_999_999), e('mile', 1)])).toBe(1_999_999_997);
  });
});

describe('balancesByParty', () => {
  const parties = [
    { id: 'ali', opening_balance: 1000 },
    { id: 'ali2', opening_balance: 0 },
    { id: 'bilal', opening_balance: -200 },
  ];

  it('works out each person on their own (three Alis stay separate)', () => {
    const entries = [
      e('diye', 500, 'active', 'ali'),
      e('diye', 300, 'active', 'ali2'),
      e('mile', 100, 'active', 'ali2'),
      e('diye', 50, 'active', 'bilal'),
    ];
    expect(balancesByParty(parties, entries)).toEqual({ ali: 1500, ali2: 200, bilal: -150 });
  });

  it('includes people with no entries and skips cancelled ones', () => {
    expect(balancesByParty(parties, [e('diye', 999, 'cancelled', 'ali')])).toEqual({ ali: 1000, ali2: 0, bilal: -200 });
  });

  it('ignores entries for unknown people and entries without a person', () => {
    const entries = [e('diye', 10, 'active', 'stranger'), e('kharcha', 10, 'active', null)];
    expect(balancesByParty(parties, entries)).toEqual({ ali: 1000, ali2: 0, bilal: -200 });
  });

  it('matches partyBalance for every person', () => {
    const entries = [e('diye', 70, 'active', 'ali'), e('mile', 20, 'active', 'ali'), e('diye', 5, 'active', 'bilal')];
    const all = balancesByParty(parties, entries);
    for (const p of parties) {
      expect(all[p.id]).toBe(partyBalance(p.opening_balance, entries.filter((x) => x.party_id === p.id)));
    }
  });
});
