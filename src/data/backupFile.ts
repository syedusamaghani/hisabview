// A backup FILE the shopkeeper keeps (WhatsApp, Drive, email), and the way back from it.
//
// Export = every record of this shop on this phone, as one JSON file.
// Restore = only records that are MISSING on this phone are added. A record that is already here is never touched or
// overwritten (a financial record is never silently replaced). The added ones are marked "waiting to send", so they also
// reach the server. The whole file is checked first: if anything is wrong, nothing is added.
import { requireShop } from './context';
import { db } from './db';
import { productsRepo } from './productsRepo';
import { statsRepo } from './statsRepo';
import type { Shop } from './types';

export const BACKUP_FORMAT = 'hisabview-backup';
export const BACKUP_VERSION = 1;
const MAX_BYTES = 60 * 1024 * 1024;

const TABLES = ['parties', 'entries', 'audit_log', 'products', 'stock_moves', 'cash_closings'] as const;
type BackupTable = (typeof TABLES)[number];
type Row = Record<string, unknown> & { id: string; shop_id: string };

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exported_at: string;
  shop: Omit<Shop, 'pending_sync'>;
  tables: Record<BackupTable, Row[]>;
};
export type RestoreSummary = { added: number; alreadyHere: number; byTable: Record<BackupTable, number> };
export class BackupError extends Error {
  constructor(public reason: 'notBackup' | 'otherShop' | 'tooNew' | 'damaged' | 'tooBig', detail = '') {
    super(`${reason}${detail ? `: ${detail}` : ''}`);
  }
}

const strip = <T extends object>(row: T): Omit<T, 'pending_sync'> => {
  const { pending_sync: _p, ...rest } = row as T & { pending_sync?: unknown };
  void _p;
  return rest as Omit<T, 'pending_sync'>;
};

export const backupFileName = (shopName: string, now = new Date()): string => {
  const safe = shopName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'shop';
  return `hisabview-backup-${safe}-${now.toISOString().slice(0, 10)}.json`;
};

export async function exportShop(): Promise<{ file: BackupFile; text: string; count: number }> {
  const shopId = requireShop();
  const shop = await db.shops.get(shopId);
  if (!shop) throw new BackupError('damaged', 'no shop');
  const tables = {} as Record<BackupTable, Row[]>;
  let count = 0;
  for (const name of TABLES) {
    const rows = (await (db[name] as unknown as { where(k: string): { equals(v: string): { toArray(): Promise<Row[]> } } }).where('shop_id').equals(shopId).toArray()).map((r) => strip(r) as Row);
    tables[name] = rows;
    count += rows.length;
  }
  const file: BackupFile = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exported_at: new Date().toISOString(), shop: strip(shop), tables };
  return { file, text: JSON.stringify(file), count };
}

const isInt = (v: unknown, min = 0): boolean => typeof v === 'number' && Number.isInteger(v) && v >= min;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isTime = (v: unknown): boolean => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// The same rules the app itself keeps when it saves a record
function checkRow(table: BackupTable, r: Row): boolean {
  if (!isStr(r.id) || !isTime(r.created_at ?? new Date().toISOString())) return false;
  switch (table) {
    case 'parties': return isStr(r.name) && (r.type === 'customer' || r.type === 'supplier');
    case 'entries': return isStr(r.kind) && isInt(r.amount, 1) && (r.status === 'active' || r.status === 'cancelled' || r.status === 'draft') && isTime(r.created_at);
    case 'audit_log': return isStr(r.entity_id) && isTime(r.created_at);
    case 'products': return isStr(r.name) && isInt(r.cost_price) && isInt(r.sell_price);
    case 'stock_moves': return isStr(r.product_id) && isStr(r.kind) && typeof r.qty_base === 'number' && Number.isInteger(r.qty_base) && isInt(r.line_total) && isTime(r.created_at);
    case 'cash_closings': return isStr(r.day) && isInt(r.counted_cash) && isTime(r.created_at);
  }
}

// Check the file without changing anything. Throws BackupError.
export function readBackup(text: string): BackupFile {
  if (text.length > MAX_BYTES) throw new BackupError('tooBig');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('notBackup');
  }
  const f = data as Partial<BackupFile> | null;
  if (!f || f.format !== BACKUP_FORMAT || typeof f.version !== 'number' || !f.shop || !f.tables) throw new BackupError('notBackup');
  if (f.version > BACKUP_VERSION) throw new BackupError('tooNew');
  for (const name of TABLES) {
    const rows = f.tables[name];
    if (!Array.isArray(rows)) throw new BackupError('damaged', `${name} missing`);
    for (const r of rows) {
      if (!r || typeof r !== 'object' || !checkRow(name, r as Row)) throw new BackupError('damaged', `${name}: bad row`);
      if ((r as Row).shop_id !== f.shop.id) throw new BackupError('damaged', `${name}: other shop`);
    }
  }
  return f as BackupFile;
}

export async function restoreFromBackup(text: string): Promise<RestoreSummary> {
  const file = readBackup(text);
  const shopId = requireShop();
  if (file.shop.id !== shopId) throw new BackupError('otherShop');
  const byTable = Object.fromEntries(TABLES.map((n) => [n, 0])) as Record<BackupTable, number>;
  let alreadyHere = 0;
  await db.transaction('rw', [db.parties, db.entries, db.audit_log, db.products, db.stock_moves, db.cash_closings], async () => {
    for (const name of TABLES) {
      const table = db[name] as unknown as { bulkGet(ids: string[]): Promise<unknown[]>; bulkAdd(rows: unknown[]): Promise<unknown> };
      const rows = file.tables[name];
      const have = await table.bulkGet(rows.map((r) => r.id));
      const missing = rows.filter((_, i) => !have[i]).map((r) => ({ ...r, pending_sync: 1 }));
      alreadyHere += rows.length - missing.length;
      byTable[name] = missing.length;
      if (missing.length > 0) await table.bulkAdd(missing);
    }
  });
  const added = TABLES.reduce((n, name) => n + byTable[name], 0);
  if (added > 0) {
    await productsRepo.rebuildStats(shopId);
    await statsRepo.rebuildAll(shopId); // the summaries are worked out again from the entries
  }
  return { added, alreadyHere, byTable };
}
