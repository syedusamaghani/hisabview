// Turns a phone row into a server row and back. The phone has one extra field (pending_sync) that the
// server never sees, and the server has one (updated_at) that the phone does not keep.
import type { SyncTable, RemoteRow } from './remote';

const FIELDS: Record<SyncTable, string[]> = {
  shops: ['id', 'owner_user_id', 'shop_name', 'language', 'created_at'],
  parties: ['id', 'shop_id', 'name', 'identifier', 'phone', 'type', 'credit_limit', 'opening_balance', 'created_at', 'archived'],
  entries: ['id', 'shop_id', 'party_id', 'kind', 'amount', 'note', 'transcript', 'source', 'status', 'promise_date', 'created_by', 'created_at', 'cancelled_at', 'cancel_reason', 'method', 'ref_id', 'invoice_no', 'category'],
  audit_log: ['id', 'shop_id', 'entity', 'entity_id', 'action', 'before_value', 'after_value', 'actor', 'reason', 'created_at'],
  products: ['id', 'shop_id', 'name', 'category', 'barcode', 'sku', 'base_unit', 'units', 'price_unit', 'cost_price', 'sell_price', 'min_stock', 'image', 'archived', 'created_at'],
  stock_moves: ['id', 'shop_id', 'product_id', 'entry_id', 'party_id', 'kind', 'qty_base', 'unit', 'unit_factor', 'unit_price', 'line_total', 'reason', 'reverses', 'created_by', 'created_at'],
  cash_closings: ['id', 'shop_id', 'day', 'opening_cash', 'expected_cash', 'counted_cash', 'difference', 'note', 'created_by', 'created_at'],
};

const TIMES = ['created_at', 'cancelled_at'];
const NUMBERS = ['amount', 'credit_limit', 'opening_balance', 'cost_price', 'sell_price', 'min_stock', 'qty_base', 'unit_factor', 'unit_price', 'line_total', 'opening_cash', 'expected_cash', 'counted_cash', 'difference'];

function pick(row: Record<string, unknown>, table: SyncTable): RemoteRow {
  const out: RemoteRow = {};
  for (const f of FIELDS[table]) if (f in row) out[f] = row[f] === undefined ? null : row[f];
  return out;
}

// What we send to the server
export function toRemote(table: SyncTable, row: object): RemoteRow {
  return pick(row as Record<string, unknown>, table);
}

// What we keep on the phone. Times become one steady format, so ordering by time always works.
export function fromRemote<T>(table: SyncTable, row: RemoteRow): T {
  const out = pick(row, table);
  for (const f of TIMES) if (typeof out[f] === 'string') out[f] = new Date(out[f] as string).toISOString();
  for (const f of NUMBERS) if (out[f] !== null && out[f] !== undefined) out[f] = Number(out[f]);
  return { ...out, pending_sync: 0 } as T;
}

// Same facts on both sides? (ignores pending_sync)
export function sameRow(table: SyncTable, a: object, b: object): boolean {
  return JSON.stringify(toRemote(table, a)) === JSON.stringify(toRemote(table, b));
}

// Tables whose rows are never changed after they are added: they have no updated_at, only a creation time
export const ADD_ONLY: SyncTable[] = ['audit_log', 'stock_moves', 'cash_closings'];

// The server's "last changed" time of a row: updated_at when it has one, else created_at (the audit diary)
export function changeTime(table: SyncTable, row: RemoteRow): string | null {
  const v = ADD_ONLY.includes(table) ? row.created_at : row.updated_at;
  return typeof v === 'string' ? v : null;
}
