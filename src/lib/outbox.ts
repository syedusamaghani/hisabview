// A small waiting box for messages that go to us (feedback, error reports). They are kept on the phone
// until there is internet and a login, so nothing is lost and nothing blocks the shopkeeper.
// Only localStorage here: this file is tiny and safe to load at app start.

export type OutboxTable = 'feedback' | 'error_log';
export type OutboxItem = { id: string; table: OutboxTable; row: Record<string, unknown> };

const KEY = 'hv_outbox';
const MAX = 50; // never grows without limit

function read(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function write(list: OutboxItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    // storage blocked or full: dropping a report is better than breaking the app
  }
}

export const outbox = {
  add(table: OutboxTable, row: Record<string, unknown>): string {
    const id = crypto.randomUUID();
    write([...read(), { id, table, row }]);
    return id;
  },
  all: read,
  remove(ids: readonly string[]) {
    const gone = new Set(ids);
    write(read().filter((i) => !gone.has(i.id)));
  },
  size: () => read().length,
};
