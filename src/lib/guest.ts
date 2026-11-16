// Using the app without a Google login. The phone makes a private "guest" id and the khata is written under it.
// After a login, src/data/guestRepo.ts moves everything under the real login (nothing is lost).
// Kept tiny and free of the database on purpose: the first screens use it.
const KEY = 'hv_guest_id';
const ASKED = 'hv_save_asked';

export function getGuestId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function makeGuestId(): string {
  const existing = getGuestId();
  if (existing) return existing;
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // storage blocked: the guest id lives only until the page closes
  }
  return id;
}

export function clearGuestId() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}

// "Apna hisaab mehfooz karein" is asked once after this many entries
export const SAVE_ASK_AFTER = 10;
export const saveAlreadyAsked = (): boolean => {
  try {
    return localStorage.getItem(ASKED) === '1';
  } catch {
    return true; // cannot remember: never nag
  }
};
export const markSaveAsked = () => {
  try {
    localStorage.setItem(ASKED, '1');
  } catch {
    // fine
  }
};
