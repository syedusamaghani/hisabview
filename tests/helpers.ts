import { expect } from 'vitest';
import { parseEntry } from '../src/voice';
import type { ParseQuestion, ParsedEntry, ParserParty } from '../src/voice';

// A Wednesday: 4 November 2026, 10:00 in Karachi
export const NOW = new Date('2026-11-04T05:00:00Z');

export const party = (id: string, name: string, identifier: string | null = null): ParserParty => ({ id, name, identifier });

export const SHOP: ParserParty[] = [
  party('aslam', 'Aslam'),
  party('bilal', 'Bilal', 'gali 3'),
  party('rashid', 'Rashid', 'doodh wala'),
  party('imran', 'Imran'),
  party('chand', 'Chand Bibi'),
  party('dawood', 'Dawood'),
  party('javed', 'Javed', 'school'),
];

// The shop above plus two Alis, for the "Kaunsa Ali?" cases
export const ALIS: ParserParty[] = [...SHOP, party('ali-chai', 'Ali', 'chai wala'), party('ali-gali', 'Ali', 'gali 4')];

export function entry(text: string, parties: ParserParty[] = SHOP): ParsedEntry {
  const r = parseEntry(text, parties, NOW);
  if (r.type !== 'entry') throw new Error(`"${text}" gave a question (${r.question}), not an entry`);
  return r;
}

export function question(text: string, parties: ParserParty[] = SHOP): ParseQuestion {
  const r = parseEntry(text, parties, NOW);
  if (r.type !== 'question') throw new Error(`"${text}" gave an entry (${r.kind} ${r.amount}), not a question`);
  return r;
}

// The amount only: "Aslam ko <said> diye"
export const amountOf = (said: string) => entry(`Aslam ko ${said} diye`).amount;

export const expectEntry = (text: string, want: { party?: string | null; kind: string; amount: number }, parties: ParserParty[] = SHOP) => {
  const r = entry(text, parties);
  expect(r.kind).toBe(want.kind);
  expect(r.amount).toBe(want.amount);
  if (want.party !== undefined) expect(r.party?.id ?? null).toBe(want.party);
  return r;
};
