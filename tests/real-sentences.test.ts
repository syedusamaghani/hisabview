// REAL SHOPKEEPER SENTENCES
// Add each recording here, one line each: what the speech recogniser wrote, and what it SHOULD give.
// Run with: npm test
//
//   said:    the exact text from the voice recording (spelling mistakes and all)
//   parties: who is in the shop (leave out to use the sample shop in helpers.ts)
//   want:    an entry      -> { kind, amount, party: 'party id' or null, promise_date? }
//            or a question -> { question: 'amount' | 'which_amount' | 'kind' | 'who' | 'which_party' | 'new_party' }
//
// A sentence the parser gets wrong is a finding, not a failure to hide. Keep it here and mark it
// with `todo: true` until the parser is taught, so the list of open problems stays honest.
import { describe, expect, it } from 'vitest';
import { parseEntry } from '../src/voice';
import type { ParserParty } from '../src/voice';
import { NOW, SHOP } from './helpers';

type Want = { kind: string; amount: number; party?: string | null; promise_date?: string } | { question: string };

type Case = { said: string; want: Want; parties?: ParserParty[]; todo?: boolean; note?: string };

const CASES: Case[] = [
  // ---- examples (replace or add below)
  { said: 'Aslam ko 500 udhaar diya', want: { kind: 'diye', amount: 500, party: 'aslam' } },
  { said: 'Bilal ne hazaar rupay wapas kiye', want: { kind: 'mile', amount: 1000, party: 'bilal' } },
  { said: 'aaj paanch hazaar ki sale', want: { kind: 'cash_sale', amount: 5000, party: null } },
  // ---- real recordings go here
];

describe('real shopkeeper sentences', () => {
  for (const c of CASES) {
    const run = c.todo ? it.skip : it;
    run(`"${c.said}"${c.note ? ` (${c.note})` : ''}`, () => {
      const r = parseEntry(c.said, c.parties ?? SHOP, NOW);
      if ('question' in c.want) {
        expect(r.type).toBe('question');
        if (r.type === 'question') expect(r.question).toBe(c.want.question);
        return;
      }
      expect(r.type).toBe('entry');
      if (r.type !== 'entry') return;
      expect(r.kind).toBe(c.want.kind);
      expect(r.amount).toBe(c.want.amount);
      if (c.want.party !== undefined) expect(r.party?.id ?? null).toBe(c.want.party);
      if (c.want.promise_date) expect(r.promise_date).toBe(c.want.promise_date);
    });
  }
});
