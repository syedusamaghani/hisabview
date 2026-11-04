import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RemoteError, supabaseRemote } from './remote';

type Call = { fn: string; args: unknown[] };

// A tiny stand-in for the Supabase client: records what was asked, answers from a script
function fakeClient(answer: (calls: Call[]) => { data?: unknown; error?: { message: string; code?: string } | null; status?: number }) {
  const calls: Call[] = [];
  const query: Record<string, unknown> = {};
  const chain = (fn: string) => (...args: unknown[]) => {
    calls.push({ fn, args });
    return query;
  };
  for (const fn of ['select', 'eq', 'gte', 'order']) query[fn] = chain(fn);
  query.range = (...args: unknown[]) => {
    calls.push({ fn: 'range', args });
    return Promise.resolve({ error: null, status: 200, ...answer(calls) });
  };
  query.maybeSingle = () => {
    calls.push({ fn: 'maybeSingle', args: [] });
    return Promise.resolve({ error: null, status: 200, ...answer(calls) });
  };
  const client = {
    from: (table: string) => {
      calls.push({ fn: 'from', args: [table] });
      return {
        ...query,
        upsert: (...args: unknown[]) => {
          calls.push({ fn: 'upsert', args });
          return Promise.resolve({ error: null, status: 201, ...answer(calls) });
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('supabaseRemote', () => {
  it('upserts by id; the audit diary leaves existing rows alone', async () => {
    const { client, calls } = fakeClient(() => ({}));
    const remote = supabaseRemote(client);
    await remote.upsert('entries', [{ id: 'a' }]);
    await remote.upsert('audit_log', [{ id: 'b' }], { ignoreDuplicates: true });
    const ups = calls.filter((c) => c.fn === 'upsert');
    expect(ups[0].args[1]).toEqual({ onConflict: 'id', ignoreDuplicates: false });
    expect(ups[1].args[1]).toEqual({ onConflict: 'id', ignoreDuplicates: true });
  });

  it('sends nothing for an empty list', async () => {
    const { client, calls } = fakeClient(() => ({}));
    await supabaseRemote(client).upsert('entries', []);
    expect(calls).toEqual([]);
  });

  it('sorts mistakes into network, login and refused', async () => {
    const cases: [{ message: string; code?: string }, number | undefined, string][] = [
      [{ message: 'TypeError: Failed to fetch' }, 0, 'network'],
      [{ message: 'Bad gateway' }, 502, 'network'],
      [{ message: 'JWT expired', code: 'PGRST301' }, 401, 'auth'],
      [{ message: 'duplicate key value', code: '23505' }, 409, 'rejected'],
      [{ message: 'new row violates row-level security policy', code: '42501' }, 403, 'rejected'],
    ];
    for (const [error, status, kind] of cases) {
      const { client } = fakeClient(() => ({ error, status }));
      const thrown = await supabaseRemote(client).upsert('parties', [{ id: 'x' }]).catch((e: unknown) => e);
      expect(thrown).toBeInstanceOf(RemoteError);
      expect((thrown as RemoteError).kind).toBe(kind);
    }
  });

  it('asks only for this shop, asks only for changes since the cursor, and reads in pages', async () => {
    const page = Array.from({ length: 1000 }, (_, i) => ({ id: `r${i}` }));
    let reads = 0;
    const { client, calls } = fakeClient(() => ({ data: reads++ === 0 ? page : [{ id: 'last' }] }));
    const rows = await supabaseRemote(client).fetchRows('entries', 'shop-1', '2026-11-04T00:00:00+00:00');
    expect(rows).toHaveLength(1001);
    expect(calls.find((c) => c.fn === 'eq')?.args).toEqual(['shop_id', 'shop-1']);
    expect(calls.find((c) => c.fn === 'gte')?.args).toEqual(['updated_at', '2026-11-04T00:00:00+00:00']);
    expect(calls.filter((c) => c.fn === 'range').map((c) => c.args)).toEqual([[0, 999], [1000, 1999]]);
  });

  it('the audit diary is followed by created_at (it has no updated_at)', async () => {
    const { client, calls } = fakeClient(() => ({ data: [] }));
    await supabaseRemote(client).fetchRows('audit_log', 'shop-1', '2026-11-04T00:00:00+00:00');
    expect(calls.find((c) => c.fn === 'gte')?.args[0]).toBe('created_at');
  });

  it('falls back to reading everything when the server has no updated_at yet (migration 0003 not run)', async () => {
    let n = 0;
    const { client, calls } = fakeClient(() => (n++ === 0 ? { error: { message: 'column does not exist', code: '42703' } } : { data: [{ id: 'a' }] }));
    const rows = await supabaseRemote(client).fetchRows('parties', 'shop-1', '2026-11-04T00:00:00+00:00');
    expect(rows).toEqual([{ id: 'a' }]);
    expect(calls.filter((c) => c.fn === 'gte')).toHaveLength(1); // the retry has no filter
  });

  it('finds my shop by my login id', async () => {
    const { client, calls } = fakeClient(() => ({ data: { id: 'shop-1' } }));
    expect(await supabaseRemote(client).fetchMyShop('user-1')).toEqual({ id: 'shop-1' });
    expect(calls.find((c) => c.fn === 'eq')?.args).toEqual(['owner_user_id', 'user-1']);
  });
});
