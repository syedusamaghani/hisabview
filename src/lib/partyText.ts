// Name matching for the party list: the search bar, and the "this name already exists" hint.

// Makes two spellings comparable: lower case, no marks, one space, and the Arabic-script
// letters that keyboards type in two ways are made the same (ي/ی, ك/ک, ه/ہ).
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟ‌-‏]/g, '') // zabar, zer, pesh and invisible marks
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[هۃۂ]/g, 'ہ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Phone numbers: only the digits, so "0300-123 4567" matches "03001234567"
const digits = (text: string) => text.replace(/\D/g, '');

type Person = { name: string; identifier: string | null; phone: string | null };

// Search bar: every word typed must be found in the name, the identifier or the phone
export function matchesQuery(person: Person, query: string): boolean {
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(`${person.name} ${person.identifier ?? ''}`);
  const phone = digits(person.phone ?? '');
  return words.every((w) => haystack.includes(w) || (digits(w).length >= 3 && phone.includes(digits(w))));
}

// Number of single-letter changes between two words (so "ahmed" and "ahmad" = 1)
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

// People whose name is the same or close to the typed name, so the shopkeeper can add a
// pehchaan (identifier) and not mix up three "Ali"s.
export function similarParties<T extends { name: string }>(typedName: string, parties: readonly T[]): T[] {
  const typed = normalizeText(typedName);
  if (typed.length < 2) return [];
  return parties.filter((p) => {
    const other = normalizeText(p.name);
    if (!other) return false;
    if (other === typed) return true;
    // "Ali" and "Ali bhai": one name starts with the other (whole words)
    if (typed.length >= 2 && (other.startsWith(`${typed} `) || typed.startsWith(`${other} `))) return true;
    // "Ali" and "Alia": one name starts with the other, only when it is short and near
    if (typed.length >= 3 && other.length >= 3 && (other.startsWith(typed) || typed.startsWith(other)) && Math.abs(other.length - typed.length) <= 2) return true;
    // A typing slip: "Ahmed" and "Ahmad"
    return typed.length >= 4 && other.length >= 4 && distance(typed, other) <= 1;
  });
}
