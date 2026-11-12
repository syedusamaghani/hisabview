# HisabView: launch checklist

Simple steps, in order. Tick each one. Everything here is **free** except one possible item (marked "may cost money").

Live site: https://hisabview.usama-syedghani.workers.dev
Privacy policy page (give this link to Google): https://hisabview.usama-syedghani.workers.dev/privacy

---

## 1. Database: run two small SQL files (5 minutes)

1. Open your Supabase project, then **SQL Editor** (left menu).
2. Click **New query**.
3. Open the file `supabase/migrations/0003_sync.sql` from the project, copy ALL the text, paste it, click **Run**. It must say "Success".
4. New query again. Same with `supabase/migrations/0004_feedback_errors.sql`.
   - 0003 makes syncing faster (the app still works without it).
   - 0004 creates the places where feedback and error reports arrive (without it, feedback and error reports are simply not delivered).

## 1b. Database: staff, roles and the server diary (5 minutes)

Do this after the two files above. Same way: **SQL Editor**, **New query**, open `supabase/migrations/0005_roles_audit_integrity.sql`, copy ALL the text, paste, **Run**. It must say "Success". Your existing khata is not touched; it only adds new things.
After it: Settings has **Staff aur role** (owner only) where you add a Manager or Cashier by their Google email. Until you run it, the app works as before without staff.

## 2. Contact email on the privacy page (2 minutes)

The privacy policy tells people how to ask for their data to be deleted. It uses the app's **Hamein batayein** button, and can also show an email address.

1. Cloudflare dashboard, then **Workers & Pages**, then **hisabview**, then **Settings**, then **Variables and Secrets** (Build variables).
2. Add: name `VITE_CONTACT_EMAIL`, value = the email you want the public to see. (Use a shop/work email if you have one, not a private one.)
3. Push any small change or click **Retry deployment** so it rebuilds.

## 3. Backup (10 minutes, one time)

The free Supabase plan has **no automatic backups** and **pauses a project after 1 week without use**. This step fixes both for free: GitHub reads the database twice a week (so it never sleeps) and saves an **encrypted** copy for 90 days.

1. Supabase, then **Project Settings**, then **API Keys**. Copy the **service_role** key (also called the secret key). Treat it like a bank password. Never send it to anyone, never put it in the code.
2. Make up a long **backup passphrase**: at least 12 letters, for example four unrelated words. **Write it on paper and keep it safe.** If you lose it, the backups cannot be opened. Nobody, including me, can recover it.
3. GitHub, open the repository, then **Settings**, then **Secrets and variables**, then **Actions**, then **New repository secret**. Add three secrets, one by one:
   - `SUPABASE_URL` = your project address (the same as `VITE_SUPABASE_URL`, looks like https://xxxx.supabase.co)
   - `SUPABASE_SERVICE_ROLE_KEY` = the key from step 1
   - `BACKUP_PASSPHRASE` = the passphrase from step 2
4. Open the **Actions** tab, then **Backup database**, then **Run workflow**. After about a minute it should show a green tick. Open that run: at the bottom, **Artifacts** shows `hisabview-backup`. That is the encrypted backup.
5. It now runs by itself every Monday and Thursday.

The repository is public, but the backup file is encrypted, so only your passphrase opens it. To read a backup, ask your developer to run `node scripts/backup.mjs --decrypt <file>`.

## 4. Google login for everyone (not only test users)

Right now only the test users you listed can log in.

1. Google Cloud Console, then **Google Auth Platform**, then **Branding**:
   - App name: HisabView
   - User support email: your email
   - App logo: `public/icon-512.png` from the project
   - **App home page:** https://hisabview.usama-syedghani.workers.dev
   - **Privacy policy link:** https://hisabview.usama-syedghani.workers.dev/privacy
   - Developer contact email: your email
2. Then **Audience**, then **Publish app**, then confirm. HisabView asks only for the basic Google details (email and name), so Google does not need a long review.
3. **May cost money:** Google may refuse the website address ending in `workers.dev` as an "authorized domain". If the Branding page says the domain is not allowed, you need your own address (for example `hisabview.pk` or `.com`). This costs about Rs 3,000 to 4,000 per year. **Do not buy it before telling me.** I will then connect it to Cloudflare and Supabase.
4. When published, log in with a Google account that is NOT in the test list to check it works.

## 5. Last check on a real phone

Use the phone test lists from the earlier chunks (voice, WhatsApp, sync). The most important:

1. A new Google account logs in, makes a shop, writes one entry in under a minute.
2. Airplane mode: the app opens, an entry is saved, "Internet aate hi save hoga" shows. Internet back: "Save ho gaya".
3. A second phone with the same login gets all the khata back.
4. Settings, then **Hamein batayein**: send a message. In Supabase **Table Editor**, the `feedback` table shows it.
5. Press and hold the app icon on the home screen: **Diye likhein** and **Mile likhein** appear.

## 6. After launch: your weekly 5 minutes

- Supabase **Table Editor**, then `error_log`: any new rows? Send me the `message` lines.
- `feedback` table: read what shopkeepers wrote.
- GitHub **Actions**: the Backup runs should be green.
