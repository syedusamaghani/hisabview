import { describe, expect, it } from 'vitest';
import { text, type Lang } from '../i18n/translations';
import { TONES, balanceLine, receiptText, reminderText, statementText, todayText } from './messages';

const who = { name: 'Aslam', shop: 'Ahmed Store' };
const e = (kind: string, amount: number, created_at: string, status = 'active') => ({ kind, amount, status, created_at });

describe('reminders', () => {
  it('fill the name, shop and amount in all three tones', () => {
    for (const { body } of TONES) {
      const msg = reminderText(body, 'ro', who, 2500);
      expect(msg).toContain('Aslam');
      expect(msg).toContain('Ahmed Store');
      expect(msg).toContain('Rs 2,500');
      expect(msg).not.toMatch(/[{}]/);
    }
  });
  it('the three tones are really different', () => {
    const msgs = TONES.map((t) => reminderText(t.body, 'ro', who, 100));
    expect(new Set(msgs).size).toBe(3);
  });
  it('Urdu script version has the same facts', () => {
    const msg = reminderText('msgNormal', 'ur', { name: 'اسلم', shop: 'احمد اسٹور' }, 2500);
    expect(msg).toContain('اسلم');
    expect(msg).toContain('Rs 2,500');
  });
});

describe('balance line', () => {
  it('they owe me, I owe them, equal', () => {
    expect(balanceLine(1800, 'ro')).toBe('Ab tak ka baqi hisaab: Rs 1,800.');
    expect(balanceLine(-300, 'ro')).toBe('Aap ke Rs 300 hamare paas jama hain.');
    expect(balanceLine(0, 'ro')).toBe('Aap ka hisaab barabar hai.');
  });
});

describe('receipt', () => {
  it('diye: what was written and the new balance', () => {
    const msg = receiptText('diye', 'ro', who, 500, 1800);
    expect(msg).toContain('Rs 500');
    expect(msg).toContain('udhaar');
    expect(msg).toContain('Rs 1,800');
  });
  it('mile: thanks, and the new balance', () => {
    const msg = receiptText('mile', 'ro', who, 1000, 0);
    expect(msg).toContain('Rs 1,000');
    expect(msg).toContain('Shukriya');
    expect(msg).toContain('barabar');
  });
});

describe('statement', () => {
  it('lists the last entries oldest first, skips cancelled ones, ends with the balance', () => {
    const list = [
      e('diye', 300, '2026-11-02T10:00:00Z'),
      e('mile', 100, '2026-11-03T10:00:00Z'),
      e('diye', 999, '2026-11-03T11:00:00Z', 'cancelled'),
      e('opening', 1000, '2026-11-01T10:00:00Z'),
    ];
    const lines = statementText('ro', who, list, 1200).split('\n');
    expect(lines[0]).toBe('Ahmed Store: Aslam ka hisaab');
    expect(lines.slice(2, 5)).toEqual(['1 Nov: Purana hisaab Rs 1,000', '2 Nov: Diye Rs 300', '3 Nov: Mile Rs 100']);
    expect(lines.at(-1)).toBe('Ab tak ka baqi hisaab: Rs 1,200.');
    expect(lines.join('\n')).not.toContain('999');
  });
  it('keeps only the latest lines when there are many', () => {
    const many = Array.from({ length: 20 }, (_, i) => e('diye', i + 1, `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`));
    const body = statementText('ro', who, many, 210, 5).split('\n');
    expect(body.filter((l) => l.includes('Diye')).length).toBe(5);
    expect(body.join('\n')).toContain('Rs 20');
  });
});

describe("today's summary text", () => {
  it('has all four numbers', () => {
    const msg = todayText('ro', 'Ahmed Store', new Date('2026-11-03T08:00:00Z'), { diye: 750, mile: 300, sale: 15500, kharcha: 3000, count: 5 });
    expect(msg).toContain('Ahmed Store: aaj ka hisaab (3 Nov)');
    expect(msg).toContain('Aaj diye: Rs 750');
    expect(msg).toContain('Aaj mile: Rs 300');
    expect(msg).toContain('Aaj ki sale: Rs 15,500');
    expect(msg).toContain('Aaj ka kharcha: Rs 3,000');
  });
});

describe('words', () => {
  it('no accounting words in any WhatsApp message, in either language', () => {
    const bad = /debit|credit|ledger|receivable|payable/i;
    for (const key of Object.keys(text) as (keyof typeof text)[]) {
      if (!/^(msg|bal|tone|today)/.test(key)) continue;
      for (const lang of ['ro', 'ur'] as Lang[]) expect(text[key][lang]).not.toMatch(bad);
    }
  });
});
