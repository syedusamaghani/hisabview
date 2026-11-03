import { db } from './db';
import { attachShop, requireUser } from './context';
import { newId, nowIso } from './ids';
import { snapshot, write } from './auditRepo';
import type { Language, Shop } from './types';

function checkName(name: string) {
  if (name.length < 1 || name.length > 80) throw new Error('Shop name must be 1 to 80 letters');
}

export const shopsRepo = {
  // The logged-in person's shop, or undefined if they have not made one yet
  async getMine(): Promise<Shop | undefined> {
    return db.shops.where('owner_user_id').equals(requireUser()).first();
  },

  async create(input: { shop_name: string; language: Language }): Promise<Shop> {
    const shop: Shop = {
      id: newId(),
      owner_user_id: requireUser(),
      shop_name: input.shop_name.trim(),
      language: input.language,
      created_at: nowIso(),
      pending_sync: 1,
    };
    checkName(shop.shop_name);
    await db.transaction('rw', db.shops, db.audit_log, async () => {
      await db.shops.add(shop);
      await write('shop', shop.id, 'create', null, snapshot(shop), shop.id);
    });
    attachShop(shop.id);
    return shop;
  },

  async update(id: string, changes: Partial<Pick<Shop, 'shop_name' | 'language'>>): Promise<Shop> {
    return db.transaction('rw', db.shops, db.audit_log, async () => {
      const before = await db.shops.get(id);
      if (!before || before.owner_user_id !== requireUser()) throw new Error('Shop not found');
      const after: Shop = { ...before, ...changes, pending_sync: 1 };
      after.shop_name = after.shop_name.trim();
      checkName(after.shop_name);
      await db.shops.put(after);
      await write('shop', id, 'edit', snapshot(before), snapshot(after), id);
      return after;
    });
  },
};
