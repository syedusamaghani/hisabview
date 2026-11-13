// Reads what the profit and dashboard screens need. Nothing is changed here, only read.
import { rangeMs, replayCosts, type DayRange, type ReportInput } from '../lib/profit';
import { unitFactor } from '../lib/stock';
import { requireShop } from './context';
import { db } from './db';
import { entriesRepo } from './entriesRepo';

export const reportRepo = {
  // The entries of the days, every stock movement (the cost of a sale depends on what came before it), and the names.
  // Sales cost is worked out from the movements in time order (see src/lib/profit.ts), so the whole movement history is read.
  async load(range: DayRange): Promise<ReportInput> {
    const shop = requireShop();
    const { fromMs, toMs } = rangeMs(range);
    const [entries, moves, products, parties] = await Promise.all([
      entriesRepo.listBetween(new Date(fromMs).toISOString(), new Date(toMs).toISOString()),
      db.stock_moves.where('shop_id').equals(shop).toArray(),
      db.products.where('shop_id').equals(shop).toArray(),
      db.parties.where('shop_id').equals(shop).toArray(),
    ]);
    const costs = replayCosts(moves, products.map((p) => ({ id: p.id, name: p.name, cost_price: p.cost_price, price_factor: unitFactor(p, p.price_unit) ?? 1 })));
    return {
      entries,
      moves,
      costs,
      partyKinds: new Map(parties.map((p) => [p.id, p.type])),
      names: new Map(products.map((p) => [p.id, p.name])),
    };
  },
};
