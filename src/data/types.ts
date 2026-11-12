// Rows kept on the phone. They mirror the Supabase tables in supabase/migrations.
// Dates are ISO text ("2026-11-03T09:30:00.000Z"), like the server's timestamptz.
// promise_date is a plain day, "2026-11-10".

// 1 = saved on the phone but not yet sent to the server (Phase 4 will send these)
export type PendingSync = 0 | 1;

export type Language = 'ro' | 'ur';
// Who a person is in a shop. The database enforces what each may do (supabase/migrations/0005); the screens only hide what would be refused.
export type Role = 'owner' | 'manager' | 'cashier';
// Why an entry was cancelled (the shopkeeper's three answers, plus the two the app writes itself)
export type CancelReason = 'wrong_entry' | 'customer_refused' | 'other' | 'undo' | 'changed';
export type PartyType = 'customer' | 'supplier';
export type PaymentMethod = 'cash' | 'jazzcash' | 'easypaisa' | 'bank' | 'other';
// purchase = goods bought from a supplier (we owe more), purchase_return = goods sent back (we owe less). Both need a supplier.
// withdrawal = cash taken out of the drawer, deposit = cash put in (no customer, always cash)
export type EntryKind = 'diye' | 'mile' | 'opening' | 'kharcha' | 'cash_sale' | 'purchase' | 'purchase_return' | 'withdrawal' | 'deposit';
export type EntrySource = 'voice' | 'manual' | 'import';
export type EntryStatus = 'active' | 'cancelled' | 'draft';

export type Shop = {
  id: string;
  owner_user_id: string;
  shop_name: string;
  language: Language;
  created_at: string;
  pending_sync: PendingSync;
};

export type Party = {
  id: string;
  shop_id: string;
  name: string;
  identifier: string | null;
  phone: string | null;
  type: PartyType;
  credit_limit: number | null;
  opening_balance: number; // negative = the customer paid in advance
  created_at: string;
  archived: boolean;
  pending_sync: PendingSync;
};

export type Entry = {
  id: string;
  shop_id: string;
  party_id: string | null;
  kind: EntryKind;
  amount: number; // whole rupees, always above 0
  note: string | null;
  transcript: string | null;
  source: EntrySource;
  status: EntryStatus;
  promise_date: string | null;
  created_by: string;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason?: CancelReason | null; // only set when cancelled
  method?: PaymentMethod | null; // how the money moved (empty on entries made before this existed)
  ref_id?: string | null; // a payment made together with a purchase points at that purchase (they are cancelled together)
  invoice_no?: string | null; // the supplier's bill number, for a purchase
  category?: string | null; // what a kharcha was for: a built-in code (rent, electricity, ...) or a name the shopkeeper typed
  pending_sync: PendingSync;
};

export type AuditEntity = 'shop' | 'party' | 'entry' | 'product' | 'cash_closing';
export type AuditAction = 'create' | 'edit' | 'cancel';

export type AuditRow = {
  id: string;
  shop_id: string;
  entity: AuditEntity;
  entity_id: string;
  action: AuditAction;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  actor: string;
  reason?: string | null; // why (for a cancel)
  created_at: string;
  pending_sync: PendingSync;
};

// ---- stock (Phase 3)
// Quantities are whole numbers of the product's base unit (see src/lib/stock.ts). Prices are whole rupees per unit.
export type BaseUnit = 'piece' | 'gram' | 'ml';
export type ProductUnit = { name: string; factor: number };
export type StockMoveKind = 'opening' | 'purchase' | 'purchase_return' | 'sale' | 'adjust' | 'damaged' | 'lost' | 'reversal';

export type Product = {
  id: string;
  shop_id: string;
  name: string;
  category: string | null;
  barcode: string | null;
  sku: string | null;
  base_unit: BaseUnit;
  units: ProductUnit[]; // packings added by the shopkeeper (carton = 144 piece); dozen, kg, litre are built in
  price_unit: string; // the unit the two prices below are per ("piece", "kg", "carton")
  cost_price: number; // what it costs me, per price_unit
  sell_price: number; // what I sell it for, per price_unit
  min_stock: number; // base units; at or below this the product is flagged low (0 = no alert)
  image: string | null; // a small compressed photo (data address)
  archived: boolean; // "deleted": hidden, never removed
  created_at: string;
  pending_sync: PendingSync;
};

// One movement of stock. Add-only: a mistake is corrected by another movement (a 'reversal' points at the one it undoes).
export type StockMove = {
  id: string;
  shop_id: string;
  product_id: string;
  entry_id: string | null; // the sale or purchase it belongs to
  party_id: string | null; // the supplier (purchase) or customer (sale on udhaar)
  kind: StockMoveKind;
  qty_base: number; // + adds stock, - removes it; never 0
  unit: string; // the unit it was typed in
  unit_factor: number;
  unit_price: number | null; // per unit, whole rupees
  line_total: number; // whole rupees
  reason: string | null;
  reverses: string | null;
  created_by: string;
  created_at: string;
  pending_sync: PendingSync;
};

// ---- cashbook (Phase 4)
// The end-of-day count of the cash drawer. Add-only: counting again the same day is a new closing (the newest one counts).
export type CashClosing = {
  id: string;
  shop_id: string;
  day: string; // the Pakistan day, "2026-11-12"
  opening_cash: number; // in the drawer when the day began
  expected_cash: number; // opening + cash in - cash out, as the app worked it out
  counted_cash: number; // what the shopkeeper really counted
  difference: number; // counted - expected (below 0 = cash is missing)
  note: string | null;
  created_by: string;
  created_at: string;
  pending_sync: PendingSync;
};

// Stock of every product, kept in step with the movements (rebuilt from them whenever needed)
export type ProductStat = { product_id: string; shop_id: string; stock: number; last_at: string | null };

// A small summary kept for every customer, so screens do not have to add up thousands of entries.
// It is derived data: it can always be rebuilt from the entries (statsRepo.rebuildAll), and it is
// updated in the same transaction as every entry change. balance above 0 = they owe me.
export type PartyStat = { party_id: string; shop_id: string; balance: number; last_at: string | null };

// Small notes the sync engine keeps for itself (for example how far the last download got)
export type SyncMeta = { key: string; value: string };

// Money limit: 9 digits, the same as the number keypad and the database
export const MAX_AMOUNT = 999_999_999;
