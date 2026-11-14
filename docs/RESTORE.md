# Getting your khata back (restore procedure)

HisabView keeps your khata in three places. Use the first one that applies.

## 1. New or lost phone, same Google login (easiest, automatic)
1. Install the app on the new phone and log in with the SAME Google account.
2. The app asks the internet first and brings back the shop, customers, entries, stock, closings and the diary. You are never asked for a new shop name.
3. Check: Home "Lene hain / Dene hain" match what you remember, and Karobar shows today's numbers.
Anything that was saved on the old phone but never reached the internet ("Internet aate hi save hoga" was showing) is NOT here. See 2.

## 2. A backup file you downloaded (Settings > "Khata ki backup file")
- Make one: Settings > "Backup file utarein". Send it to yourself on WhatsApp / Drive / email. Do it after a busy day, or weekly. The file has customer names and phone numbers: keep it private.
- Bring back: log in (so the shop exists on the phone), Settings > "Backup file se wapas lao", choose the file.
- Rules: only records that are MISSING on the phone are added. A record that is already there is never changed (a cancelled entry stays cancelled). A file from another shop, or a damaged file, adds nothing. The added records are then sent to the internet too.

## 3. The automatic internet backup (for the developer / owner)
- GitHub Actions (Monday and Thursday) saves ONE encrypted file with `scripts/backup.mjs` (AES-256-GCM, passphrase in the GitHub secret BACKUP_PASSPHRASE). The repository is public, so it is never stored unencrypted.
- Read it: `node scripts/backup.mjs --decrypt FILE` (asks for the passphrase) prints the JSON of every table.
- To put it back into Supabase: run the SQL migrations on a fresh project, then insert the rows table by table (shops, parties, entries, audit_log, products, stock_moves, cash_closings, shop_members) with the Table Editor or a script using the service-role key. Entries are frozen by database rules, so insert them exactly as they are.

## After any restore
- Settings should show "Save ho gaya". Open Karobar and compare today's sale, profit and the stock value with what you know.
- If a balance looks wrong the app works it out again from the entries on its own after every download (and reports it to us).
