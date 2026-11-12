// Audit log: a permanent diary of what was created or cancelled, with before/after values.
// Rows are only ever added. The repositories call write() inside the same transaction as
// the change itself, so a change and its diary line are saved together or not at all.
import { db } from './db';
import { requireShop, requireUser } from './context';
import { newId, nowIso } from './ids';
import type { AuditAction, AuditEntity, AuditRow } from './types';

type Values = Record<string, unknown> | null;

// Strips the phone-only field so the diary shows the real record
export function snapshot<T extends { pending_sync: number }>(row: T): Values {
  const { pending_sync: _ignored, ...rest } = row;
  return rest;
}

// Call only inside a db.transaction(...) that includes the audit_log table
export async function write(entity: AuditEntity, entityId: string, action: AuditAction, before: Values, after: Values, shopId = requireShop(), reason: string | null = null) {
  const row: AuditRow = {
    id: newId(),
    shop_id: shopId,
    entity,
    entity_id: entityId,
    action,
    before_value: before,
    after_value: after,
    actor: requireUser(),
    ...(reason ? { reason } : {}),
    created_at: nowIso(),
    pending_sync: 1,
  };
  await db.audit_log.add(row);
}

export const auditRepo = {
  // The history of one shop, party or entry, oldest first
  async listFor(entityId: string): Promise<AuditRow[]> {
    const rows = await db.audit_log.where('entity_id').equals(entityId).toArray();
    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
};
