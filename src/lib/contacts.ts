// The phone's contact list, through the Contact Picker API. Only some Android Chrome
// phones have it. Where it is missing, the screens hide the button and the person
// types the name by hand.

type ContactsManager = {
  select: (props: string[], options?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]>;
};

export type PickedContact = { name: string | null; phone: string | null };

export function contactPickerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window && window.isSecureContext;
}

// Opens the phone's own contact chooser. Returns null if the person closes it without choosing.
export async function pickContact(): Promise<PickedContact | null> {
  try {
    const contacts = (navigator as unknown as { contacts: ContactsManager }).contacts;
    const [picked] = await contacts.select(['name', 'tel'], { multiple: false });
    if (!picked) return null;
    return { name: picked.name?.[0]?.trim() || null, phone: picked.tel?.[0]?.replace(/[^\d+]/g, '') || null };
  } catch {
    return null;
  }
}

// Opens the phone's contact chooser so the person can tick MANY contacts at once (there is a "select all").
// The browser never lets an app read the whole phonebook by itself; this one tap is the only way.
export async function pickManyContacts(): Promise<PickedContact[] | null> {
  try {
    const contacts = (navigator as unknown as { contacts: ContactsManager }).contacts;
    const picked = await contacts.select(['name', 'tel'], { multiple: true });
    return picked.map((c) => ({ name: c.name?.[0]?.trim() || null, phone: c.tel?.[0]?.replace(/[^\d+]/g, '') || null }));
  } catch {
    return null;
  }
}
