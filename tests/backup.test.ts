import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error plain JavaScript file without types
import { decrypt, encrypt, runBackup } from '../scripts/backup.mjs';

// A pretend Supabase that answers like PostgREST (pages of 1000 rows, the service key required)
const KEY = 'service-key';
const data: Record<string, unknown[]> = {
  shops: [{ id: 's1', shop_name: 'Ahmed Store' }],
  parties: Array.from({ length: 2300 }, (_, i) => ({ id: `p${String(i).padStart(5, '0')}`, name: `Customer ${i}` })),
  entries: [{ id: 'e1', amount: 500 }],
  audit_log: [],
  // feedback and error_log are missing on purpose: the migration 0004 may not have been run
};
let server: ReturnType<typeof createServer>;
let url = '';

beforeAll(async () => {
  server = createServer((req, res) => {
    const u = new URL(req.url ?? '', 'http://x');
    const table = u.pathname.split('/').pop() ?? '';
    if (req.headers.apikey !== KEY || req.headers.authorization !== `Bearer ${KEY}`) {
      res.writeHead(401).end('{}');
      return;
    }
    if (!(table in data)) {
      res.writeHead(404).end('{}');
      return;
    }
    const offset = Number(u.searchParams.get('offset') ?? 0);
    const limit = Number(u.searchParams.get('limit') ?? 1000);
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(data[table].slice(offset, offset + limit)));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => void server.close());

const PASS = 'a-long-secret-passphrase';

describe('backup', () => {
  it('reads every row of every table (also past 1000 rows) into one encrypted file', async () => {
    const { file, counts } = await runBackup({ url, key: KEY, passphrase: PASS, now: new Date('2026-11-04T03:00:00Z') });
    expect(counts).toEqual({ shops: 1, parties: 2300, entries: 1, audit_log: 0 });
    const back = JSON.parse(decrypt(file, PASS));
    expect(back.taken_at).toBe('2026-11-04T03:00:00.000Z');
    expect(back.tables.parties).toHaveLength(2300);
    expect(back.tables.parties[2299].name).toBe('Customer 2299');
    expect(back.tables.shops[0].shop_name).toBe('Ahmed Store');
  });

  it('the file is not readable without the passphrase (the repository is public)', async () => {
    const { file } = await runBackup({ url, key: KEY, passphrase: PASS });
    expect(file.toString('utf8')).not.toContain('Ahmed Store');
    expect(file.toString('utf8')).not.toContain('Customer 5');
    expect(() => decrypt(file, 'the-wrong-passphrase!')).toThrow(/Wrong passphrase/);
    expect(() => decrypt(Buffer.from('HVBK1 not a real file'), PASS)).toThrow();
    expect(() => decrypt(Buffer.from('something else'), PASS)).toThrow(/not a HisabView backup/);
  });

  it('two backups of the same data look different (fresh salt each time)', () => {
    expect(encrypt('same', PASS).equals(encrypt('same', PASS))).toBe(false);
  });

  it('refuses a weak passphrase, a wrong key and a missing setting', async () => {
    await expect(runBackup({ url, key: KEY, passphrase: 'short' })).rejects.toThrow(/at least 12/);
    await expect(runBackup({ url, key: 'wrong', passphrase: PASS })).rejects.toThrow(/HTTP 401/);
    await expect(runBackup({ url: '', key: KEY, passphrase: PASS })).rejects.toThrow(/needed/);
  });
});
