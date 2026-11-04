// New ids and times are made on the phone, so saving works without internet.
export const newId = (): string => crypto.randomUUID();

// Time never repeats: two saves in the same millisecond still get different, increasing
// times, so history and the audit diary always keep their true order.
let last = 0;
export function nowIso(): string {
  last = Math.max(Date.now(), last + 1);
  return new Date(last).toISOString();
}
