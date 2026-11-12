// Credit limit: how much udhaar a customer may have. Only a warning, never a block (a shopkeeper knows their
// regular customers). Pure functions.

// Would this new udhaar take the customer above their limit? Returns the limit when it would.
// balance = what they owe now (above 0 = they owe me); adding = the udhaar being written now.
export function overCreditLimit(limit: number | null | undefined, balance: number, adding: number): number | null {
  if (!limit || limit <= 0 || adding <= 0) return null;
  return balance + adding > limit ? limit : null;
}

// How much more udhaar fits under the limit (0 = at or over it); null = no limit set
export function creditLeft(limit: number | null | undefined, balance: number): number | null {
  if (!limit || limit <= 0) return null;
  return Math.max(0, limit - Math.max(0, balance));
}
