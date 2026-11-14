// Every stock movement of the shop. Read as a plain table scan and filtered in memory: on a phone with one shop (the usual case)
// that is several times faster than going through the shop_id index, which fetches every row separately (measured on 20,000 movements).
import { db } from './db';
import type { StockMove } from './types';

export async function shopMoves(shopId: string): Promise<StockMove[]> {
  return (await db.stock_moves.toArray()).filter((m) => m.shop_id === shopId);
}
