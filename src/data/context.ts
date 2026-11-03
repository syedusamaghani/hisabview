// Who is using the app right now. Set once after login (and once the shop is known).
// The repositories read it, so screens never pass user or shop ids around.
type DataContext = { userId: string; shopId: string | null };

let current: DataContext | null = null;

export function setDataContext(next: DataContext | null) {
  current = next;
}

export function requireUser(): string {
  if (!current) throw new Error('Not logged in');
  return current.userId;
}

export function requireShop(): string {
  if (!current?.shopId) throw new Error('No shop yet');
  return current.shopId;
}

// Used when the first shop is being created
export function attachShop(shopId: string) {
  if (!current) throw new Error('Not logged in');
  current = { ...current, shopId };
}
