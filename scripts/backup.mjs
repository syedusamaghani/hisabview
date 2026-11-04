// Backup of the whole HisabView database into ONE encrypted file.
//
// Why: the free Supabase plan has no automatic backups. This script (run weekly by GitHub, see
// .github/workflows/backup.yml) reads every table and saves it encrypted with a passphrase only you know.
// Reading the database every few days also stops the free plan from pausing the project.
//
// The service-role key is a powerful secret: it lives ONLY in GitHub "Secrets", never in the code.
// The file is encrypted (AES-256-GCM, key from the passphrase with scrypt), so even though this
// repository is public, nobody can read the backup without the passphrase.
//
//   node scripts/backup.mjs                 makes backup-YYYY-MM-DD.json.enc  (needs the 3 settings below)
//   node scripts/backup.mjs --decrypt FILE  prints the readable JSON (asks for BACKUP_PASSPHRASE)
//
// Settings (environment variables): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKUP_PASSPHRASE
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

export const TABLES = ['shops', 'parties', 'entries', 'audit_log', 'feedback', 'error_log'];
const PAGE = 1000;
const MAGIC = 'HVBK1';

// Every row of one table, page by page
async function readTable(table, { url, key, fetchImpl }) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetchImpl(`${url}/rest/v1/${table}?select=*&order=id.asc&limit=${PAGE}&offset=${offset}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      // A table that is not there yet (for example feedback before migration 0004 was run) is not an error
      if (res.status === 404 || res.status === 400) return null;
      throw new Error(`Reading ${table} failed: HTTP ${res.status}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export function encrypt(text, passphrase) {
  if (!passphrase || passphrase.length < 12) throw new Error('BACKUP_PASSPHRASE must be at least 12 characters');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from(MAGIC), salt, iv, cipher.getAuthTag(), body]);
}

export function decrypt(buffer, passphrase) {
  if (buffer.subarray(0, MAGIC.length).toString() !== MAGIC) throw new Error('This is not a HisabView backup file');
  let p = MAGIC.length;
  const salt = buffer.subarray(p, (p += 16));
  const iv = buffer.subarray(p, (p += 12));
  const tag = buffer.subarray(p, (p += 16));
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(buffer.subarray(p)), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Wrong passphrase, or the file is damaged');
  }
}

// Reads everything and returns { file: encrypted bytes, counts: rows per table }
export async function runBackup({ url, key, passphrase, fetchImpl = fetch, now = new Date() }) {
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed');
  const tables = {};
  const counts = {};
  for (const table of TABLES) {
    const rows = await readTable(table, { url: url.replace(/\/$/, ''), key, fetchImpl });
    if (rows === null) continue;
    tables[table] = rows;
    counts[table] = rows.length;
  }
  if (!tables.shops) throw new Error('The shops table could not be read: check the URL and the key');
  const json = JSON.stringify({ app: 'HisabView', taken_at: now.toISOString(), counts, tables });
  return { file: encrypt(json, passphrase), counts };
}

// ---- command line
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const env = process.env;
  if (process.argv[2] === '--decrypt') {
    process.stdout.write(decrypt(readFileSync(process.argv[3]), env.BACKUP_PASSPHRASE ?? '') + '\n');
  } else {
    const { file, counts } = await runBackup({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY, passphrase: env.BACKUP_PASSPHRASE });
    const name = `backup-${new Date().toISOString().slice(0, 10)}.json.enc`;
    writeFileSync(name, file);
    console.log(`${name} written (${file.length} bytes). Rows:`, counts);
  }
}
