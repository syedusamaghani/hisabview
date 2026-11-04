// Builds the WhatsApp links for the screens. Screens use the data folder only through its repositories;
// this file does the same and hands back a ready link, so a tap can open WhatsApp straight away.
import { entriesRepo, partiesRepo, shopsRepo } from '../data';
import type { Lang } from '../i18n/translations';
import { partyBalance } from '../lib/balance';
import { receiptText } from '../lib/messages';
import { whatsappUrl } from '../lib/whatsapp';

// After "Theek hai": the receipt for that entry, or null when it has no customer (sale, kharcha)
export async function receiptLink(entryId: string, lang: Lang): Promise<string | null> {
  const entry = await entriesRepo.get(entryId);
  if (!entry || !entry.party_id || (entry.kind !== 'diye' && entry.kind !== 'mile')) return null;
  const [party, entries, shop] = await Promise.all([partiesRepo.get(entry.party_id), entriesRepo.listForParty(entry.party_id), shopsRepo.getMine()]);
  if (!party || !shop) return null;
  const text = receiptText(entry.kind, lang, { name: party.name, shop: shop.shop_name }, entry.amount, partyBalance(party, entries));
  return whatsappUrl(party.phone, text);
}
