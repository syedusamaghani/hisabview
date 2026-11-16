// Bulk add of items: turns a pasted list ("Biscuit 20", "Sugar - 150", "Soap, 80") into rows of name + price.
// Pure text work, no network. The person then fixes the rows in a table before anything is saved.

export type BulkRow = { name: string; price: string }; // price stays text while it is edited; digits only

const DIGITS: Record<string, string> = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9', '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
const toLatin = (s: string) => s.replace(/[۰-۹٠-٩]/g, (c) => DIGITS[c] ?? c);

const HEADER = new Set(['name', 'item', 'items', 'naam', 'saman', 'product', 'نام', 'سامان', 'آئٹم']);

// Number at the end of a line, with an optional "Rs" / "/-" / "روپے" after it
const PRICE_AT_END = /(\d[\d,]*(?:\.\d+)?)\s*(?:rs\.?|rupees?|\/-|روپے|روپیہ)?\s*$/i;

export function parseList(text: string): BulkRow[] {
  const rows: BulkRow[] = [];
  for (const raw of toLatin(text).split(/\r?\n/)) {
    let line = raw.trim().replace(/^\s*\d{1,3}\s*[.)]\s+/, ''); // "1. Biscuit" -> "Biscuit"
    line = line.replace(/^(rs\.?|₨)\s*/i, '');
    if (!line) continue;
    const m = PRICE_AT_END.exec(line);
    let name = line;
    let price = '';
    if (m && m.index > 0) {
      name = line.slice(0, m.index);
      price = String(Math.round(Number(m[1].replace(/,/g, ''))));
    } else if (m && m.index === 0) continue; // a lone number is not an item
    name = name.replace(/(rs\.?|₨|[-–—:=,;|\t])+\s*$/i, '').replace(/[-–—:=,;|\t]+\s*$/, '').trim();
    name = name.replace(/\s{2,}/g, ' ');
    if (!name || name.toLowerCase().split(/[\s,;|:-]+/).filter(Boolean).every((w) => HEADER.has(w) || w === 'price' || w === 'rate' || w === 'qeemat')) continue;
    if (!/[\p{L}\p{N}]/u.test(name)) continue;
    rows.push({ name: name.slice(0, 120), price: price.length > 9 ? '' : price });
  }
  return rows;
}

// Which rows can be saved, which are skipped because the item exists already or is repeated in the table
export function splitRows(rows: BulkRow[], existingNames: string[]): { ok: BulkRow[]; dup: BulkRow[]; empty: number } {
  const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const seen = new Set(existingNames.map(key));
  const ok: BulkRow[] = [];
  const dup: BulkRow[] = [];
  let empty = 0;
  for (const r of rows) {
    if (!r.name.trim()) {
      empty += 1;
      continue;
    }
    const k = key(r.name);
    if (seen.has(k)) dup.push(r);
    else {
      seen.add(k);
      ok.push(r);
    }
  }
  return { ok, dup, empty };
}
