// New ids and times are made on the phone, so saving works without internet.
export const newId = (): string => crypto.randomUUID();
export const nowIso = (): string => new Date().toISOString();
