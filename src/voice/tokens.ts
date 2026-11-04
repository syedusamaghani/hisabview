// Cuts a spoken sentence into words and tells which ones the parser knows.
import { normalizeText } from '../lib/partyText';
import { lookup, type Tag } from './vocabulary';

export type Token = {
  text: string; // lower case, Arabic-script letters made uniform
  tag: Tag | null; // null = an unknown word (maybe a name)
  digits: number | null; // set for a typed number such as 500 or 2.5
  asWord: boolean; // a digit that belongs to a pehchaan ("gali 3"), not to the amount
};

const DOT = 'ʼ'; // keeps the dot of 2.5 alive through normalizeText

export function tokenize(raw: string, identifierPairs: ReadonlySet<string> = new Set()): Token[] {
  let s = raw
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // Urdu digits
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic digits
    .replace(/(\d)[,،٬](?=\d{3}(?!\d))/g, '$1') // 1,000 -> 1000
    .replace(/(\d)\.(?=\d)/g, `$1${DOT}`);
  s = normalizeText(s);

  const pieces = s.match(new RegExp(`\\d+(?:${DOT}\\d+)?|[\\p{L}]+`, 'gu')) ?? [];
  const tokens: Token[] = pieces.map((p) => {
    if (/^\d/.test(p)) return { text: p.replace(DOT, '.'), tag: null, digits: parseFloat(p.replace(DOT, '.')), asWord: false };
    return { text: p, tag: lookup(p), digits: null, asWord: false };
  });

  // Words said twice in a row ("Ali Ali", "500 500") count once
  for (let i = tokens.length - 1; i > 0; i--) if (tokens[i].text === tokens[i - 1].text) tokens.splice(i, 1);

  // "2 500" said as two numbers (some phones put a space in 2,500)
  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (a.digits !== null && b.digits !== null && /^\d{1,3}$/.test(a.text) && /^\d{3}$/.test(b.text)) {
      tokens.splice(i, 2, { text: String(a.digits * 1000 + b.digits), tag: null, digits: a.digits * 1000 + b.digits, asWord: false });
    }
  }

  // "gali 3": when a customer's pehchaan has that word and number, the 3 is not money
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].digits !== null && tokens[i - 1].digits === null && identifierPairs.has(`${tokens[i - 1].text} ${tokens[i].text}`)) {
      tokens[i].asWord = true;
    }
  }
  return tokens;
}
