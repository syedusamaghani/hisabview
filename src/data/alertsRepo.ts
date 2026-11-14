// Reads what the alerts need and keeps the on/off choices. The choices are saved on this phone (sync_meta), per login,
// so each person (and each phone) picks what they want to hear about. Alerts themselves are never stored.
import { movement } from '../lib/movers';
import { PRICE_ALERT_DAYS, priceChanges, purchaseBuys } from '../lib/pricing';
import { ALERT_KINDS, buildAlerts, DEFAULT_PREFS, RECENT_DAYS, CLOSING_DAYS, type Alert, type AlertPrefs } from '../lib/alerts';
import { requireShop, requireUser } from './context';
import { shopMoves } from './moves';
import { db } from './db';
import { productsRepo } from './productsRepo';
import { statsRepo } from './statsRepo';

const prefsKey = (userId: string) => `alert_prefs:${userId}`;

export async function getAlertPrefs(userId: string): Promise<AlertPrefs> {
  const raw = (await db.sync_meta.get(prefsKey(userId)))?.value;
  const prefs = { ...DEFAULT_PREFS };
  if (!raw) return prefs;
  try {
    const saved = JSON.parse(raw) as Partial<Record<string, unknown>>;
    for (const k of ALERT_KINDS) if (typeof saved[k] === 'boolean') prefs[k] = saved[k] as boolean;
  } catch {
    /* a damaged value falls back to "everything on" */
  }
  return prefs;
}

export async function setAlertPrefs(userId: string, prefs: AlertPrefs): Promise<void> {
  await db.sync_meta.put({ key: prefsKey(userId), value: JSON.stringify(prefs) });
}

export const alertsRepo = {
  // `summary` (today's sales / expenses / profit) is passed in by the screen that already has it; the dashboard counts without it
  async load(summary: { sales: number; expenses: number; profit: number } | null = null, now = Date.now()): Promise<{ alerts: Alert[]; prefs: AlertPrefs }> {
    const shop = requireShop();
    const userId = requireUser();
    const sinceIso = new Date(now - RECENT_DAYS * 86_400_000).toISOString();
    const closingFrom = new Date(now - (CLOSING_DAYS + 1) * 86_400_000).toISOString();
    const [prefs, stock, products, parties, stats, allMoves, audit, closings, promised] = await Promise.all([
      getAlertPrefs(userId),
      productsRepo.listStock(),
      db.products.where('shop_id').equals(shop).toArray(),
      db.parties.where('shop_id').equals(shop).toArray(),
      statsRepo.all(),
      shopMoves(shop), // add-only; the speed of the price and sales-rate guesses needs the history
      db.audit_log.where('created_at').aboveOrEqual(sinceIso).toArray().then((rows) => rows.filter((a) => a.shop_id === shop)),
      db.cash_closings.where('created_at').aboveOrEqual(closingFrom).toArray().then((rows) => rows.filter((c) => c.shop_id === shop)),
      db.entries.where('kind').equals('diye').toArray().then((rows) => rows.filter((e) => e.shop_id === shop && e.status === 'active' && !!e.promise_date)),
    ]);
    const balances: Record<string, number> = {};
    for (const p of parties) balances[p.id] = stats[p.id]?.balance ?? 0;
    const productMap = new Map(products.map((p) => [p.id, p]));
    const recentMoves = allMoves.filter((m) => (m.kind === 'sale' || m.kind === 'reversal') && m.created_at >= sinceIso);
    const stockNow: Record<string, number> = {};
    for (const r of stock) stockNow[r.product.id] = r.stock;
    const alerts = buildAlerts(
      {
        now,
        userId,
        lowStock: stock.filter((r) => r.low).map((r) => ({ product: r.product, stock: r.stock })),
        recentSales: recentMoves,
        products: productMap,
        audit,
        closings,
        entries: promised,
        parties,
        balances,
        summary,
        priceChanges: priceChanges(purchaseBuys(allMoves, productMap), productMap, now - PRICE_ALERT_DAYS * 86_400_000),
        runningOut: movement(allMoves, products, stockNow, now).runningOut,
      },
      prefs,
    );
    return { alerts, prefs };
  },
};
