// Finds the amount in a sentence: "pandrah sau", "dhai hazaar", "sawa sau", "derh lakh", 2,500 ...
// Everything is counted in quarter rupees inside, so "sawa sau" (1.25 x 100) stays exact.
import type { Token } from './tokens';

export type Run = { start: number; end: number; value: number | null; strong: boolean };

const MAX = 999_999_999;

// A word like "do" after "de" or "kar" is the verb ("de do"), not the number 2
function isVerbDo(tokens: Token[], i: number): boolean {
  const t = tokens[i];
  if (t.tag?.t !== 'unit' || t.tag.v !== 2) return false;
  const prev = tokens[i - 1];
  if (!prev) return false;
  const verbs = ['kar', 'kr', 'likh', 'likho', 'daal', 'dal', 'dalo', 'کر', 'لکھ', 'لکھو'];
  const afterVerb = (prev.tag?.t === 'word' && prev.tag.v === 'give') || verbs.includes(prev.text);
  return afterVerb && !numericAt(tokens, i + 1, new Set());
}

function numericAt(tokens: Token[], i: number, skip: ReadonlySet<number>): boolean {
  const t = tokens[i];
  if (!t || skip.has(i) || t.asWord) return false;
  if (t.digits !== null) return true;
  const tag = t.tag;
  if (!tag) return false;
  if (tag.t === 'mult' || tag.t === 'frac') return true;
  if (tag.t === 'unit') {
    if (tag.amb) return tokens[i + 1]?.tag?.t === 'mult'; // "saath hazaar" yes, "ke saath" no
    return !isVerbDo(tokens, i);
  }
  return false;
}

// Quarter-rupee value of a plain number token (typed or a word), or null
function quarters(t: Token): number | null {
  const v = t.digits ?? (t.tag?.t === 'unit' ? t.tag.v : null);
  if (v === null) return null;
  const q = v * 4;
  return Number.isInteger(q) ? q : null;
}

function parseRun(run: Token[]): number | null {
  let total = 0; // whole rupees from finished hazaar/lakh groups
  let cur = 0; // quarter rupees of the group being built
  let plain = false; // cur is a plain number that a multiplier may still scale
  let lastBig = Infinity;

  for (let i = 0; i < run.length; i++) {
    const t = run[i];
    const q = quarters(t);
    if (q !== null) {
      if (plain) return null; // two plain numbers in a row ("500 500")
      cur += q;
      plain = true;
      continue;
    }
    const tag = t.tag;
    if (tag?.t === 'frac') {
      if (plain) return null;
      if (tag.v === 'derh') cur += 6;
      else if (tag.v === 'dhai') cur += 10;
      else {
        // sawa / paune / sade: "sawa sau", "paune do sau", "sade teen hazaar"
        const next = run[i + 1];
        const nextQ = next ? quarters(next) : null;
        if (next?.tag?.t === 'mult') {
          if (tag.v === 'sade') return null;
          cur += tag.v === 'sawa' ? 5 : 3;
        } else if (nextQ !== null) {
          cur += nextQ + (tag.v === 'sawa' ? 1 : tag.v === 'paune' ? -1 : 2);
          i++;
        } else return null;
      }
      plain = true;
      continue;
    }
    if (tag?.t === 'mult') {
      const m = tag.v;
      if (m === 100) {
        if (cur > 0 && !plain) return null; // "sau sau"
        cur = (plain ? cur : 4) * 100;
        plain = false;
      } else {
        if (m >= lastBig) return null; // "lakh hazaar" the wrong way round
        const base = cur > 0 ? cur : 4;
        if ((base * m) % 4 !== 0) return null;
        total += (base * m) / 4;
        cur = 0;
        plain = false;
        lastBig = m;
      }
      continue;
    }
    return null;
  }
  if (cur % 4 !== 0) return null; // "sawa" alone is 1.25 rupees: not a real amount
  total += cur / 4;
  return total >= 1 && total <= MAX ? total : null;
}

// Every group of neighbouring number words in the sentence, with its value
export function findRuns(tokens: Token[], skip: ReadonlySet<number>): Run[] {
  const runs: Run[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (!numericAt(tokens, i, skip)) {
      i++;
      continue;
    }
    let j = i;
    while (j < tokens.length && numericAt(tokens, j, skip)) j++;
    addRuns(tokens, i, j, runs);
    i = j;
  }
  return runs;
}

function addRuns(tokens: Token[], start: number, end: number, runs: Run[]) {
  const make = (s: number, e: number): Run => {
    const slice = tokens.slice(s, e);
    const value = parseRun(slice);
    const strong = slice.some((t) => t.digits !== null || t.tag?.t === 'mult') || (value !== null && value >= 10);
    return { start: s, end: e, value, strong };
  };
  const whole = make(start, end);
  if (whole.value !== null || end - start < 2) {
    runs.push(whole);
    return;
  }
  // "ek 50": two numbers touching. Keep them as two separate numbers instead of losing both.
  for (let k = start + 1; k < end; k++) {
    const left = make(start, k);
    const right = make(k, end);
    if (left.value !== null && right.value !== null) {
      runs.push(left, right);
      return;
    }
  }
  runs.push(whole);
}

export type AmountChoice =
  | { kind: 'one'; value: number; weak: boolean }
  | { kind: 'many'; values: number[] }
  | { kind: 'none' };

// One clear amount, or two different ones, or nothing. A lone small word ("ek chai") never beats a real number.
export function chooseAmount(runs: Run[]): AmountChoice {
  const valid = runs.filter((r) => r.value !== null);
  const unique = (list: Run[]) => [...new Set(list.map((r) => r.value as number))];
  const strong = unique(valid.filter((r) => r.strong));
  if (strong.length === 1) return { kind: 'one', value: strong[0], weak: false };
  if (strong.length > 1) return { kind: 'many', values: strong };
  const weak = unique(valid.filter((r) => !r.strong));
  if (weak.length === 1) return { kind: 'one', value: weak[0], weak: true };
  if (weak.length > 1) return { kind: 'many', values: weak };
  return { kind: 'none' };
}
