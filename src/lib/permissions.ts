// What each role may do. The database is the real guard (supabase/migrations/0005_roles_audit_integrity.sql);
// these rules only decide which buttons are shown, so nobody taps something that will be refused.
//
//  Owner   : everything, including staff and the shop's settings.
//  Manager : writes entries, cancels and changes entries, edits customers. Not settings, not staff.
//  Cashier : writes entries and adds customers. Can take back their OWN entry within 10 minutes (Wapas lo).
//            Anything older, or anybody else's, needs a manager or the owner.
import type { Role } from '../data/types';

// 'revoked' = the owner switched the login off: nothing is allowed
type Who = Role | 'revoked';

export const CASHIER_UNDO_MS = 10 * 60_000;

export const canEditCustomer = (role: Who): boolean => role === 'owner' || role === 'manager';
// Items, buying, returning goods and fixing stock: owner and manager. A cashier only sells (and sees the stock).
export const canManageStock = (role: Who): boolean => role === 'owner' || role === 'manager';
// The cash drawer (taking cash out, putting it in, the daily closing): owner and manager. A cashier does not see the day's cash.
export const canManageCash = (role: Who): boolean => role === 'owner' || role === 'manager';
export const canChangeShop = (role: Who): boolean => role === 'owner';
export const canManageStaff = (role: Who): boolean => role === 'owner';

// Cancel or "Badlo" an entry that is already saved
export function canChangeEntry(role: Who, entry: { created_by: string; created_at: string }, userId: string, now = Date.now()): boolean {
  if (role === 'revoked') return false;
  if (role !== 'cashier') return true;
  return entry.created_by === userId && now - Date.parse(entry.created_at) <= CASHIER_UNDO_MS;
}
