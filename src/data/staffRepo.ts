// The shop's team (Owner, Manager, Cashier). Unlike everything else this needs the internet: staff live on the
// server, because the server is what refuses a cashier's forbidden changes. Only the owner can use it.
// An invited person simply logs in with that Google email; the invitation becomes a membership at login.
import type { Role } from './types';

export type StaffMember = { user_id: string; role: Role; active: boolean; email: string | null };
export type StaffInvite = { id: string; email: string; role: 'manager' | 'cashier'; accepted: boolean };

// offline = no internet, missing = the server has no staff feature yet (migration 0005 not run), refused = the server said no
export class StaffError extends Error {
  constructor(public kind: 'offline' | 'missing' | 'refused') {
    super(kind);
  }
}

type PgError = { code?: string; message: string } | null;

async function connect() {
  const { supabase } = await import('../lib/supabase');
  if (!supabase) throw new StaffError('offline');
  return supabase;
}

function check(error: PgError) {
  if (!error) return;
  if (['42P01', 'PGRST205', '42883', 'PGRST202'].includes(error.code ?? '')) throw new StaffError('missing');
  if (!error.code) throw new StaffError('offline'); // no database answer = no connection
  throw new StaffError('refused');
}

export const staffRepo = {
  async list(shopId: string): Promise<{ members: StaffMember[]; invites: StaffInvite[] }> {
    const client = await connect();
    const members = await client.from('shop_members').select('user_id, role, active, email').eq('shop_id', shopId).order('created_at', { ascending: true });
    check(members.error);
    const invites = await client.from('shop_invites').select('id, email, role, accepted_at').eq('shop_id', shopId).is('accepted_at', null).order('created_at', { ascending: true });
    check(invites.error);
    return {
      members: (members.data ?? []) as StaffMember[],
      invites: ((invites.data ?? []) as { id: string; email: string; role: 'manager' | 'cashier'; accepted_at: string | null }[]).map((i) => ({ id: i.id, email: i.email, role: i.role, accepted: i.accepted_at !== null })),
    };
  },

  async invite(email: string, role: 'manager' | 'cashier'): Promise<void> {
    const client = await connect();
    check((await client.rpc('invite_member', { p_email: email, p_role: role })).error);
  },

  // Change a role, or switch a person off / on again. Nobody is ever deleted: their old entries keep their name.
  async setMember(userId: string, role: 'manager' | 'cashier', active: boolean): Promise<void> {
    const client = await connect();
    check((await client.rpc('set_member', { p_user: userId, p_role: role, p_active: active })).error);
  },
};
