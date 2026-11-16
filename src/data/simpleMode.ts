// "Simple mode": a first-time shopkeeper sees only Home, Customers, Diye/Mile, the WhatsApp reminder and Settings.
// Stock, cashbook, profit, staff, alerts, reports, sale and kharcha stay hidden until a switch in Settings turns them on.
//
// The choice is kept on this phone, per shop (localStorage hv_simple:<shop>). The first time a shop is opened without a
// saved choice: a shop that already has stock, a cashbook (closings, expenses, sales, purchases, drawer moves) keeps
// EVERYTHING on; any other shop starts in simple mode (this is every new shop). Only the owner is ever in simple mode:
// a manager or cashier needs the other screens for their work.
import { useSyncExternalStore } from 'react';
import { db } from './db';
import { useRole } from './useRole';

const key = (shopId: string) => `hv_simple:${shopId}`;
const listeners = new Set<() => void>();
let active: { shop: string; simple: boolean } | null = null;

const read = (shopId: string): boolean | null => {
  try {
    const v = localStorage.getItem(key(shopId));
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
};
const emit = () => listeners.forEach((l) => l());

// Does this khata already use more than the plain udhaar khata?
export async function usesMoreThanKhata(shopId: string): Promise<boolean> {
  if ((await db.products.where('shop_id').equals(shopId).count()) > 0) return true;
  if ((await db.cash_closings.where('shop_id').equals(shopId).count()) > 0) return true;
  for (const kind of ['kharcha', 'cash_sale', 'purchase', 'purchase_return', 'withdrawal', 'deposit']) {
    if ((await db.entries.where('kind').equals(kind).filter((e) => e.shop_id === shopId).count()) > 0) return true;
  }
  return false;
}

// Called once when the shop is known (before the first screen is drawn)
export async function ensureSimpleMode(shopId: string): Promise<boolean> {
  let simple = read(shopId);
  if (simple === null) {
    simple = !(await usesMoreThanKhata(shopId));
    try {
      localStorage.setItem(key(shopId), simple ? '1' : '0');
    } catch {
      // not remembered: it is worked out again next time
    }
  }
  active = { shop: shopId, simple };
  emit();
  return simple;
}

export function setSimpleMode(shopId: string, simple: boolean) {
  try {
    localStorage.setItem(key(shopId), simple ? '1' : '0');
  } catch {
    // stays for this session only
  }
  active = { shop: shopId, simple };
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

// true = show only the simple screens
export function useSimpleMode(): boolean {
  const simple = useSyncExternalStore(subscribe, () => active?.simple ?? false);
  const role = useRole();
  return simple && (role === undefined || role === 'owner');
}

// The same, for code that needs the shop too (Settings switch)
export const currentSimple = (): boolean => active?.simple ?? false;

// Screens that simple mode hides: a person who opens such an address by hand lands on Home instead
const HIDDEN = /^\/(stock|cashbook|expenses|team|activity|alerts|dashboard|profit|movers|reports|today)(\/|$)/;
export const hiddenInSimple = (path: string): boolean => HIDDEN.test(path);
