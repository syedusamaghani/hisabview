import { shopsRepo } from './shopsRepo';
import type { StoredRole } from './roleStore';
import { useLive } from './useLive';

// The role of the logged-in person (undefined for a moment while it is read from the phone).
// 'revoked' = the owner switched this login off.
export function useRole(): StoredRole | undefined {
  return useLive(() => shopsRepo.myRole(), []);
}
