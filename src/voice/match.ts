// Which customer did the shopkeeper mean? Spelling-tolerant, works across Roman Urdu and Urdu script,
// and also looks at the pehchaan ("chai wala", "gali 3").
import { distance, normalizeText } from '../lib/partyText';
import type { ParserParty } from './types';
import { isWala } from './vocabulary';

const URDU: Record<string, string> = {
  ا: 'a', آ: 'a', أ: 'a', ع: 'a', ء: '', ئ: 'y', ی: 'y', ے: 'y', ؤ: 'u', ں: '', ھ: '',
  ب: 'b', پ: 'p', ت: 't', ٹ: 't', ث: 's', ج: 'j', چ: 'C', ح: 'h', خ: 'K', د: 'd', ڈ: 'd', ذ: 'z',
  ر: 'r', ڑ: 'r', ز: 'z', ژ: 'Z', س: 's', ش: 'S', ص: 's', ض: 'z', ط: 't', ظ: 'z', غ: 'G', ف: 'f',
  ق: 'k', ک: 'k', گ: 'g', ل: 'l', م: 'm', ن: 'n',
};

// A rough "sound shape" of a name: vowels and spelling habits removed, Urdu letters turned into
// Roman ones. "Bilal", "Bilaal" and "بلال" all become "bl".
export function skeleton(word: string): string {
  const w = normalizeText(word).replace(/\s/g, '');
  let s = '';
  [...w].forEach((ch, i) => {
    if (ch === 'و') s += i === 0 ? 'v' : 'u';
    else if (ch === 'ہ') s += i === w.length - 1 && w.length > 1 ? 'a' : 'h';
    else s += URDU[ch] ?? ch;
  });
  s = s
    .replace(/ph/g, 'f')
    .replace(/sh/g, 'S')
    .replace(/ch/g, 'C')
    .replace(/kh/g, 'K')
    .replace(/gh/g, 'G')
    .replace(/zh/g, 'Z')
    .replace(/([bdtjrlg])h/g, '$1') // bh, dh, th ...: spelling habit only
    .replace(/q/g, 'k')
    .replace(/c/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/w/g, 'v')
    .replace(/([aeiouy])h$/, '$1')
    .replace(/(.)\1+/g, '$1'); // typed doubles: "Asslam", "Bilaal"
  const first = s[0] ?? '';
  const rest = s.slice(1).replace(/[aeiouyv]/g, '');
  const head = /[aeiouy]/.test(first) ? 'a' : first;
  return head + rest;
}

type Source = 'name' | 'id';
type Tier = 0 | 1 | 2; // 0 spelled the same, 1 same sound, 2 one letter off

function pair(a: string, b: string, source: Source): { score: number; tier: Tier } | null {
  const genA = isWala(a);
  const genB = isWala(b);
  if (genA || genB) return genA && genB ? { score: 0.2, tier: 0 } : null;
  const nm = source === 'name';
  if (a === b) return { score: nm ? 3 : 2, tier: 0 };
  if (/^\d/.test(a) || /^\d/.test(b)) return null; // numbers must be exactly the same
  const sa = skeleton(a);
  const sb = skeleton(b);
  if (sa.length >= 2 && sa === sb) return { score: nm ? 2 : 1.2, tier: 1 };
  // One sound off ("Aslam"/"Aslan"), but never a different first sound: "Kamran" is not "Imran"
  if (sa.length >= 4 && sb.length >= 4 && sa[0] === sb[0] && distance(sa, sb) === 1) return { score: nm ? 1.5 : 0.9, tier: 2 };
  return null;
}

export type Candidate = { party: ParserParty; score: number; tier: Tier };

const words = (text: string | null) => (text ? normalizeText(text).split(' ').filter(Boolean) : []);

function score(said: string[], party: ParserParty): Candidate | null {
  const nameWords = words(party.name);
  const idWords = words(party.identifier);
  const pairs: { i: number; j: number; score: number; tier: Tier; source: Source }[] = [];
  said.forEach((s, i) => {
    nameWords.forEach((n, j) => {
      const p = pair(s, n, 'name');
      if (p) pairs.push({ i, j, source: 'name', ...p });
    });
    idWords.forEach((n, j) => {
      const p = pair(s, n, 'id');
      if (p) pairs.push({ i, j: j + 1000, source: 'id', ...p });
    });
  });
  pairs.sort((a, b) => b.score - a.score);
  const usedSaid = new Set<number>();
  const usedKnown = new Set<number>();
  let total = 0;
  let tier: Tier = 0;
  for (const p of pairs) {
    if (usedSaid.has(p.i) || usedKnown.has(p.j)) continue;
    usedSaid.add(p.i);
    usedKnown.add(p.j);
    total += p.score;
    if (p.score > 0.2) tier = Math.max(tier, p.tier) as Tier;
  }
  // Every word that names someone must be explained by this customer, or it is somebody else
  const unexplained = said.some((s, i) => !usedSaid.has(i) && !isWala(s));
  if (unexplained) return null;
  const unmentioned = nameWords.filter((n, j) => !usedKnown.has(j) && !isWala(n)).length;
  return { party, score: total - 0.5 * unmentioned, tier };
}

export type Matched =
  | { kind: 'one'; candidate: Candidate }
  | { kind: 'many'; candidates: Candidate[] }
  | { kind: 'none' };

// `said` = the name words from the sentence (no amount, no kind words)
export function matchParty(said: string[], parties: readonly ParserParty[]): Matched {
  const all = parties
    .map((p) => score(said, p))
    .filter((c): c is Candidate => c !== null)
    // Spelled-the-same beats sounds-the-same ("doodh wala" is not "Dawood"), then the higher score
    .sort((a, b) => a.tier - b.tier || b.score - a.score);
  if (all.length === 0) return { kind: 'none' };
  const top = all[0];
  const close = all.filter((c) => c.tier === top.tier && c.score >= top.score - 0.75);
  if (close.length > 1) return { kind: 'many', candidates: close };
  return { kind: 'one', candidate: top };
}

// "Word 3" pairs of every pehchaan, so "gali 3" is not mistaken for an amount
export function identifierPairs(parties: readonly ParserParty[]): Set<string> {
  const out = new Set<string>();
  for (const p of parties) {
    const w = words(p.identifier);
    for (let i = 1; i < w.length; i++) if (/^\d+$/.test(w[i])) out.add(`${w[i - 1]} ${w[i]}`);
  }
  return out;
}
