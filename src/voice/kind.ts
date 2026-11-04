// What happened: did the shopkeeper give (diye), receive (mile), sell, or spend?
// If the words point two ways, or nowhere, we say so, and the parser asks. It never picks one by luck.
import type { Token } from './tokens';
import type { ParsedKind } from './types';

export type KindFound =
  | { kind: 'one'; value: ParsedKind; viaNe: boolean }
  | { kind: 'conflict'; options: ParsedKind[] }
  | { kind: 'none' };

export function detectKind(tokens: Token[]): KindFound {
  const words = tokens.map((t) => (t.tag?.t === 'word' ? t.tag.v : null));
  const has = (w: string) => words.includes(w as never);
  const hasKo = has('ko');
  const hasNe = has('ne');

  const found = new Set<ParsedKind>();
  let generalGive = false;
  let viaNe = false;

  words.forEach((w, i) => {
    if (w === 'sale') found.add('cash_sale');
    else if (w === 'kharcha') found.add('kharcha');
    else if (w === 'mile') found.add('mile');
    else if (w === 'udhaar') found.add('diye');
    else if (w === 'give') {
      // "de gaya" = he gave me
      if (words[i + 1] === 'gone') found.add('mile');
      else generalGive = true;
    } else if (w === 'take' && words[i + 1] === 'gone') found.add('diye'); // "le gaya" = he took
  });

  // A plain "diye / de diya" depends on who did it: "Ali ko ... diye" gave, "Ali ne ... diye" received
  if (generalGive) {
    const bigKind = found.has('cash_sale') || found.has('kharcha');
    if (hasNe && !hasKo) {
      if (!bigKind) {
        found.add('mile');
        viaNe = true;
      }
    } else if (hasNe && hasKo) {
      found.add('diye');
      found.add('mile'); // both: cannot tell who did it
    } else if (!bigKind) {
      found.add('diye');
    }
  }

  const list = [...found];
  if (list.length === 1) return { kind: 'one', value: list[0], viaNe };
  if (list.length > 1) return { kind: 'conflict', options: list };
  return { kind: 'none' };
}
