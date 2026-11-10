// The contacts the person chose to share with the app, kept ONLY on this phone (never sent to the server).
// They are used for two things: finding a name that was heard or typed, and filling in the phone number.
import { matchesQuery, normalizeText } from './partyText';

const KEY = 'hv_contacts';

export type BookContact = { name: string; phone: string };

export function loadBook(): BookContact[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((c): c is BookContact => !!c && typeof c.name === 'string' && typeof c.phone === 'string') : [];
  } catch {
    return [];
  }
}

// Add newly chosen contacts to the saved ones (one entry per phone number). Returns the new list.
export function addToBook(picked: { name: string | null; phone: string | null }[]): BookContact[] {
  const byPhone = new Map(loadBook().map((c) => [c.phone, c]));
  for (const c of picked) if (c.name && c.phone) byPhone.set(c.phone, { name: c.name, phone: c.phone });
  const list = [...byPhone.values()].slice(0, 5000);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the contacts just are not remembered
  }
  return list;
}

export function clearBook() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}

const digits = (text: string) => text.replace(/\D/g, '');

// Contacts that are not customers yet (same number or same name = already a customer)
export function notYetCustomers(book: readonly BookContact[], parties: readonly { name: string; phone: string | null }[]): BookContact[] {
  const phones = new Set(parties.map((p) => digits(p.phone ?? '')).filter(Boolean));
  const names = new Set(parties.map((p) => normalizeText(p.name)));
  return book.filter((c) => !phones.has(digits(c.phone)) && !names.has(normalizeText(c.name)));
}

// Type a few letters of a name (or digits of a number): the matching contacts
export function searchBook(book: readonly BookContact[], query: string, limit = 5): BookContact[] {
  return book.filter((c) => matchesQuery({ name: c.name, identifier: null, phone: c.phone }, query)).slice(0, limit);
}
