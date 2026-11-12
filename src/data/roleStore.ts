// Which role this login has in the shop, remembered on the phone so the app knows it without internet.
// It is only used to HIDE things; the database is what really refuses (supabase/migrations/0005).
// The role is looked up on every sync round, so a change made by the owner reaches the phone.
import { db } from './db';
import type { Role } from './types';

export type StoredRole = Role | 'revoked';

const roleKey = (userId: string) => `role:${userId}`;
const shopKey = (userId: string) => `member_shop:${userId}`;

export async function getStoredRole(userId: string): Promise<StoredRole | null> {
  const value = (await db.sync_meta.get(roleKey(userId)))?.value;
  return value === 'owner' || value === 'manager' || value === 'cashier' || value === 'revoked' ? value : null;
}

export async function storeRole(userId: string, role: StoredRole) {
  await db.sync_meta.put({ key: roleKey(userId), value: role });
}

// A person who works in somebody else's shop: which shop it is
export async function getMemberShopId(userId: string): Promise<string | null> {
  return (await db.sync_meta.get(shopKey(userId)))?.value ?? null;
}

export async function storeMemberShop(userId: string, shopId: string) {
  await db.sync_meta.put({ key: shopKey(userId), value: shopId });
}
