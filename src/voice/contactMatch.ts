// Contacts whose name is the same as, or sounds like, a name the phone heard (the reader may spell
// it differently: "Aslam", "Asslam", "اسلم"). Uses the same "sound shape" as the customer matching.
import type { BookContact } from '../lib/contactBook';
import { normalizeText, similarParties } from '../lib/partyText';
import { skeleton } from './match';

export function similarContacts(heard: string, book: readonly BookContact[], limit = 3): BookContact[] {
  const firstWord = normalizeText(heard).split(' ')[0] ?? '';
  const shape = skeleton(firstWord);
  const byText = similarParties(heard, book);
  const bySound = shape.length >= 2 ? book.filter((c) => skeleton(normalizeText(c.name).split(' ')[0] ?? '') === shape) : [];
  return [...new Set([...byText, ...bySound])].slice(0, limit);
}
