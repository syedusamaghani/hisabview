// The rule-based voice parser: no internet, no cost, runs on the phone.
// Order of questions when something is missing: amount, then kind, then customer. Never a guess.
import { detectKind, type KindFound } from './kind';
import { findDay } from './dates';
import { findAlias, identifierPairs, matchParty, type Candidate, type Matched } from './match';
import { chooseAmount, findRuns, type AmountChoice } from './numbers';
import { tokenize } from './tokens';
import type { EntryParser, Forced, ParseQuestion, ParseResult, ParsedKind, ParserParty, Known, Warning } from './types';

const rupees = (n: number) => `Rs ${n.toLocaleString('en-US')}`;

// "chai wala" -> "Chai Wala" (Urdu script is left as it is)
const titleCase = (words: string[]) => words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function parseEntry(text: string, parties: readonly ParserParty[], now: Date = new Date(), forced: Forced = {}): ParseResult {
  const tokens = tokenize(text, identifierPairs(parties));
  const day = findDay(tokens, now);
  const runs = findRuns(tokens, day.used);
  // "Saeed ka hisaab clear karo": no amount is said, it means the whole balance
  const wantsSettle = tokens.some((t) => t.tag?.t === 'word' && t.tag.v === 'settle');
  let amount: AmountChoice = forced.amount ? { kind: 'one', value: forced.amount, weak: false } : chooseAmount(runs);
  // "saaf kar do": the little word "do" is also the number 2, but here it only means "please do it"
  if (wantsSettle && !forced.amount && amount.kind === 'one' && amount.value <= 10 && !tokens.some((t) => t.digits !== null)) {
    amount = { kind: 'none' };
  }
  let kind: KindFound = forced.kind ? { kind: 'one', value: forced.kind, viaNe: false } : detectKind(tokens);

  // The words left over are the customer: not numbers, not kind words, not "ko", "bhai", ...
  const inRun = new Set<number>();
  runs.forEach((r) => {
    for (let i = r.start; i < r.end; i++) inRun.add(i);
  });
  // A name the phone mis-heard before and the shopkeeper corrected ("sahib" = Saeed), if it is the whole name said
  let alias = forced.party ? null : findAlias(tokens.map((t) => t.text), parties);
  const aliasWords = new Set<number>();
  if (alias) for (let i = alias.start; i < alias.end; i++) aliasWords.add(i);
  const free = (t: (typeof tokens)[number], i: number) => !inRun.has(i) && !day.used.has(i) && !aliasWords.has(i) && t.tag === null;
  // Another unknown word next to it means a different name: then the normal matching decides
  if (alias && tokens.some(free)) {
    alias = null;
    aliasWords.clear();
  }
  const said = tokens
    .filter((t, i) => !inRun.has(i) && !day.used.has(i) && !aliasWords.has(i) && (t.tag === null || (t.tag.t === 'word' && t.tag.v === 'wala')))
    .map((t) => t.text);
  const nameWords = tokens.filter(free).map((t) => t.text);

  const needsParty = kind.kind !== 'one' || kind.value === 'diye' || kind.value === 'mile';
  const match: Matched | null = forced.party
    ? { kind: 'one', candidate: { party: forced.party, score: 99, tier: 0 } }
    : alias && needsParty
      ? { kind: 'one', candidate: { party: alias.party, score: 50, tier: 0 } }
      : needsParty && nameWords.length > 0
        ? matchParty(said, parties)
        : null;
  const heardName = alias ? alias.text : nameWords.join(' ');

  // Settle the whole balance: they owe us (+) so we receive it (mile); we owe them (-) so we give it (diye).
  // Needs the balance to be known; with a balance of zero there is nothing to settle.
  if (wantsSettle && amount.kind === 'none' && match?.kind === 'one' && match.candidate.party.balance !== undefined) {
    const who = match.candidate.party;
    const balance = who.balance as number;
    if (balance === 0) return { type: 'question', question: 'settled', name: who.name, partial: { party: who } };
    amount = { kind: 'one', value: Math.abs(balance), weak: false };
    if (!forced.kind) kind = { kind: 'one', value: balance > 0 ? 'mile' : 'diye', viaNe: false };
  }

  // What we already know, kept inside any question so nothing is lost
  const partial: Known = {};
  if (amount.kind === 'one') partial.amount = amount.value;
  if (kind.kind === 'one') partial.kind = kind.value;
  if (match?.kind === 'one') partial.party = match.candidate.party;
  if (day.date) partial.promise_date = day.date;

  const ask = (q: Omit<ParseQuestion, 'type' | 'partial'>): ParseQuestion => ({ type: 'question', partial, ...q });

  if (amount.kind === 'none') return ask({ question: 'amount' });
  if (amount.kind === 'many') {
    return ask({ question: 'which_amount', options: amount.values.map((v) => ({ value: String(v), label: rupees(v) })) });
  }
  if (kind.kind !== 'one') {
    const options: ParsedKind[] = kind.kind === 'conflict' ? kind.options : ['diye', 'mile'];
    return ask({ question: 'kind', options: options.map((value) => ({ value })) });
  }

  // Sale and kharcha have no customer
  let party: ParserParty | null = null;
  let chosen: Candidate | null = null;
  if (kind.value === 'diye' || kind.value === 'mile') {
    if (!forced.party && !alias && nameWords.length === 0) return ask({ question: 'who' });
    if (!match || match.kind === 'none') return ask({ question: 'new_party', name: titleCase(said) });
    if (match.kind === 'many') {
      const shown = match.candidates.slice(0, 5);
      return ask({
        question: 'which_party',
        name: titleCase(nameWords),
        options: shown.map((c) => ({ value: c.party.id, label: c.party.name, hint: c.party.identifier ?? undefined })),
      });
    }
    chosen = match.candidate;
    party = chosen.party;
  }

  // ---- a full answer: how sure are we?
  const warnings: Warning[] = [];
  let confidence = 0.95;
  if (chosen?.tier === 1) confidence = Math.min(confidence, 0.88);
  if (chosen?.tier === 2) {
    confidence = Math.min(confidence, 0.65);
    warnings.push('fuzzy_name');
  }
  if (amount.weak) {
    confidence = Math.min(confidence, 0.6);
    warnings.push('weak_amount');
  }
  if (kind.viaNe) confidence = Math.min(confidence, 0.85);

  // A promise day only means something for "diye". "kal 500 diye the" is the past, not a promise.
  let promise_date = day.date;
  if (promise_date) {
    const saidPast = tokens.some((t) => t.tag?.t === 'word' && t.tag.v === 'past');
    if (kind.value !== 'diye' || (day.guessedDirection && saidPast)) {
      promise_date = undefined;
      warnings.push('day_ignored');
      confidence = Math.min(confidence, 0.7);
    } else if (day.guessedDirection) {
      confidence = Math.min(confidence, 0.8);
    }
  }

  const result: ParseResult = {
    type: 'entry',
    party,
    kind: kind.value,
    amount: amount.value,
    confidence: Math.round(confidence * 100) / 100,
  };
  if (promise_date) result.promise_date = promise_date;
  if (party && heardName) result.heard_name = heardName;
  if (warnings.length) result.warnings = warnings;
  return result;
}

export const ruleParser: EntryParser = {
  parse: (text, parties, now, forced) => parseEntry(text, parties, now, forced),
};
