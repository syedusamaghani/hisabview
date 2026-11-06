// What the phone got wrong before, and the shopkeeper corrected: "sahib" -> Saeed. It is kept ONLY on this
// phone (see aliasStore.ts) and is used only to help the voice reader find the right customer.
// If a wrong one is ever learned, Settings can wipe all of them.
import { normalizeText } from '../lib/partyText';
import { defaultStore, loadAliases, saveAliases, type Book, type Store } from './aliasStore';
import { matchParty } from './match';
import type { ParserParty } from './types';

const MAX_PER_PERSON = 5;

export { clearAliases, countAliases, loadAliases } from './aliasStore';

// The customers, each with the spellings learned for them
export function withAliases<T extends ParserParty>(parties: readonly T[], book: Book = loadAliases()): T[] {
  return parties.map((p) => (book[p.id]?.length ? { ...p, aliases: book[p.id] } : p));
}

// Called after a voice entry is saved. If the name the phone heard is not a plausible spelling of the
// customer who was finally chosen, the phone got it wrong: remember it. Returns true if something was learned.
// `everyone` = all customers: if the heard name fits ANOTHER real customer, the phone heard it right, so nothing is learned.
export function learnAlias(
  heardName: string | undefined,
  party: ParserParty,
  everyone: readonly ParserParty[] = [],
  store: Store | null = defaultStore(),
): boolean {
  const heard = normalizeText(heardName ?? '');
  const words = heard.split(' ').filter(Boolean);
  if (!store || words.length === 0 || words.length > 3 || words.some((w) => /\d/.test(w) || w.length < 2)) return false;
  if (matchParty(words, [party]).kind !== 'none') return false; // it was a fine spelling of that name
  if (everyone.some((p) => p.id !== party.id && matchParty(words, [p]).kind !== 'none')) return false;
  const book = loadAliases(store);
  const list = book[party.id] ?? [];
  if (list.includes(heard)) return false;
  // Newest first, never more than a few per person
  book[party.id] = [heard, ...list].slice(0, MAX_PER_PERSON);
  return saveAliases(book, store);
}
