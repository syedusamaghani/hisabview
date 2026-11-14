// Builds the WhatsApp links for the screens. Screens use the data folder only through its repositories;
// this file does the same and hands back a ready link, so a tap can open WhatsApp straight away.
import { entriesRepo, partiesRepo, productsRepo, shopsRepo, tradeRepo } from '../data';
import { text, type Lang, type TextKey } from '../i18n/translations';
import { partyBalance } from '../lib/balance';
import { receiptText, saleReceiptText, type SaleReceiptLine } from '../lib/messages';
import { lineTotal } from '../lib/stock';
import { whatsappUrl } from '../lib/whatsapp';
import { qtyText } from './stock/stockText';

// After "Theek hai": the bill for a sale made from Saman, or the receipt of a Diye / Mile with a customer; null for the rest (kharcha ...)
export async function receiptLink(entryId: string, lang: Lang): Promise<string | null> {
  const entry = await entriesRepo.get(entryId);
  if (!entry) return null;
  const shop = await shopsRepo.getMine();
  if (!shop) return null;

  if (entry.kind === 'cash_sale' || entry.kind === 'diye') {
    const moves = (await tradeRepo.movesOfEntry(entry.id)).filter((m) => m.kind === 'sale');
    if (moves.length > 0 && !(entry.kind === 'diye' && entry.party_id && (await partiesRepo.get(entry.party_id))?.type === 'supplier')) {
      const t = (k: TextKey) => text[k][lang];
      const lines: SaleReceiptLine[] = [];
      let listTotal = 0;
      for (const m of moves) {
        const product = await productsRepo.get(m.product_id);
        if (!product) continue;
        const list = m.unit_price ? lineTotal(m.qty_base, m.unit_price, m.unit_factor) : 0;
        listTotal += list;
        lines.push({ name: product.name, qty: qtyText(t, -m.qty_base, product), amount: list, free: m.unit_price === 0 });
      }
      const party = entry.party_id ? await partiesRepo.get(entry.party_id) : null;
      const balance = party ? partyBalance(party, await entriesRepo.listForParty(party.id)) : null;
      return whatsappUrl(party?.phone ?? null, saleReceiptText(lang, { shop: shop.shop_name, customer: party?.name ?? null }, lines, Math.max(0, listTotal - entry.amount), entry.amount, balance));
    }
  }

  if (!entry.party_id || (entry.kind !== 'diye' && entry.kind !== 'mile')) return null;
  const [party, entries] = await Promise.all([partiesRepo.get(entry.party_id), entriesRepo.listForParty(entry.party_id)]);
  if (!party) return null;
  return whatsappUrl(party.phone, receiptText(entry.kind, lang, { name: party.name, shop: shop.shop_name }, entry.amount, partyBalance(party, entries)));
}
