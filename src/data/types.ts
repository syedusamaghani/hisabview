// Rows kept on the phone. They mirror the Supabase tables in supabase/migrations.
// Dates are ISO text ("2026-11-03T09:30:00.000Z"), like the server's timestamptz.
// promise_date is a plain day, "2026-11-10".

// 1 = saved on the phone but not yet sent to the server (Phase 4 will send these)
export type PendingSync = 0 | 1;

export type Language = 'ro' | 'ur';
export type PartyType = 'customer' | 'supplier';
export type EntryKind = 'diye' | 'mile' | 'opening' | 'kharcha' | 'cash_sale';
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
  pending_sync: PendingSync;
};

export type AuditEntity = 'shop' | 'party' | 'entry';
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
  created_at: string;
  pending_sync: PendingSync;
};

// Money limit: 9 digits, the same as the number keypad and the database
export const MAX_AMOUNT = 999_999_999;
