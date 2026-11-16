// The small mic on the amount step: say only a number ("paanch sau", "five hundred", "پانچ سو", "500").
// Loaded only when the mic is tapped. The same number reader as the full voice parser is used.
import { ruleParser } from './ruleParser';

const MAX = 999_999_999;

// The amount in what was said, or null. Plain digits (also Urdu digits, "1,500") are read first.
export async function parseAmount(text: string): Promise<number | null> {
  const latin = text.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
  const digits = /^\s*(?:rs\.?\s*)?(\d[\d,]*)\s*(?:rs\.?|rupay[ae]?|روپے)?\s*$/i.exec(latin);
  if (digits) {
    const n = Number(digits[1].replace(/,/g, ''));
    return Number.isInteger(n) && n > 0 && n <= MAX ? n : null;
  }
  const result = await ruleParser.parse(text, []);
  const amount = result.type === 'entry' ? result.amount : result.partial.amount;
  return typeof amount === 'number' && Number.isInteger(amount) && amount > 0 && amount <= MAX ? amount : null;
}
