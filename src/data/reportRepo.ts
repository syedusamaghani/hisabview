// Reads what the profit and dashboard screens need. Nothing is changed here, only read.
import { buildReportData, type ReportData } from '../lib/reports';
import { rangeMs, replayCosts, type DayRange, type ReportInput } from '../lib/profit';
import { unitFactor } from '../lib/stock';
import { requireShop } from './context';
import { db } from './db';
import { shopMoves } from './moves';
import { entriesRepo } from './entriesRepo';
import { partiesRepo } from './partiesRepo';
import { productsRepo } from './productsRepo';
import { statsRepo } from './statsRepo';
import { saleEntryIds, staffStats } from '../lib/team';
import type { Entry, StockMove } from './types';

export const reportRepo = {
  // The entries of the days, every stock movement (the cost of a sale depends on what came before it), and the names.
  // Sales cost is worked out from the movements in time order (see src/lib/profit.ts), so the whole movement history is read.
  async load(range: DayRange): Promise<ReportInput> {
    return (await reportRepo.loadRaw(range)).input;
  },

  async loadRaw(range: DayRange): Promise<{ input: ReportInput; entries: Entry[]; moves: StockMove[] }> {
    const shop = requireShop();
    const { fromMs, toMs } = rangeMs(range);
    const [entries, moves, products, parties] = await Promise.all([
      entriesRepo.listBetween(new Date(fromMs).toISOString(), new Date(toMs).toISOString()),
      shopMoves(shop),
      db.products.where('shop_id').equals(shop).toArray(),
      db.parties.where('shop_id').equals(shop).toArray(),
    ]);
    const costs = replayCosts(moves, products.map((p) => ({ id: p.id, name: p.name, cost_price: p.cost_price, price_factor: unitFactor(p, p.price_unit) ?? 1 })));
    return {
      entries,
      moves,
      input: {
        entries,
        moves,
        costs,
        partyKinds: new Map(parties.map((p) => [p.id, p.type])),
        names: new Map(products.map((p) => [p.id, p.name])),
      },
    };
  },

  // Everything the Reports screen lists, read the same way the dashboard reads it (same functions, same numbers)
  async forReports(range: DayRange): Promise<ReportData> {
    const { fromMs, toMs } = rangeMs(range);
    const [raw, stock, parties, stats, audit] = await Promise.all([
      reportRepo.loadRaw(range),
      productsRepo.listStock(),
      partiesRepo.listAll(),
      statsRepo.all(),
      db.audit_log.where('created_at').between(new Date(fromMs).toISOString(), new Date(toMs).toISOString(), true, false).toArray().then((rows) => rows.filter((a) => a.shop_id === requireShop())),
    ]);
    const { input } = raw;
    const balances: Record<string, number> = {};
    for (const p of parties) if (!p.archived) balances[p.id] = stats[p.id]?.balance ?? 0;
    // staff figures from what is already loaded (the same rule as the Staff screen: src/lib/team.ts)
    return buildReportData(range, input, stock, parties, balances, staffStats(raw.entries, audit, saleEntryIds(raw.moves), fromMs, toMs));
  },
};
