// After an entry is saved for a customer who has no phone number yet, we ask once:
// "Is this person in your contacts?" so Yaad dilao and Hisaab bhejo can open their own chat.
// "Baad mein" is remembered per customer on this phone, so we never nag.
import { finishFlow, navigate } from './router';

const KEY = 'hv_phone_skip';

const skipped = (): string[] => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export function skipPhoneAsk(partyId: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set([...skipped(), partyId])].slice(-500)));
  } catch {
    // Not remembering is fine: we may ask once more
  }
}

// Leave the entry flow: through the "contacts?" question when it makes sense, otherwise straight back
export function finishEntryFlow(party: { id: string; phone: string | null } | null, fallback: string) {
  if (party && !party.phone && !skipped().includes(party.id)) navigate(`/party/${party.id}/link`);
  else finishFlow(fallback);
}
