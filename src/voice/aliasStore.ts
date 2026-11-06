// Where the learned spellings are kept: this phone only (not sent anywhere). Small on purpose, so Settings can
// use it (show a count, wipe it) without loading the voice reader.
export const ALIAS_KEY = 'hv_aliases';

export type Book = Record<string, string[]>; // customer id -> spellings the phone got wrong

export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const defaultStore = (): Store | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export function loadAliases(store: Store | null = defaultStore()): Book {
  try {
    const raw = store?.getItem(ALIAS_KEY);
    const book = raw ? (JSON.parse(raw) as unknown) : {};
    return book && typeof book === 'object' && !Array.isArray(book) ? (book as Book) : {};
  } catch {
    return {};
  }
}

export function saveAliases(book: Book, store: Store | null = defaultStore()): boolean {
  try {
    store?.setItem(ALIAS_KEY, JSON.stringify(book));
    return store !== null;
  } catch {
    return false;
  }
}

export function countAliases(store: Store | null = defaultStore()): number {
  return Object.values(loadAliases(store)).reduce((sum, list) => sum + list.length, 0);
}

export function clearAliases(store: Store | null = defaultStore()): void {
  try {
    store?.removeItem(ALIAS_KEY);
  } catch {
    // storage blocked: nothing was kept anyway
  }
}
