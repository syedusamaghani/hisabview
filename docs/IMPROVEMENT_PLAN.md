# HisabView: Audit and Improvement Plan (Phase 0)

Written 12 Nov 2026 from the code at commit ce247e4. This phase changed NO app code. Everything below was checked by reading the code and migrations, running the 310 unit tests (all pass), building the app, and running the voice parser on 33 realistic phrases.

What is checked and what is not:
- Checked: code, SQL, tests, build size, parser behaviour on typed text.
- NOT checked: a real Android phone (speech accuracy, Contact Picker, WhatsApp deep link, speed on 2 GB RAM). Those statements are marked "unverified".

Note on the brief: it speaks of stock, products and payments tables. HisabView has none of these. It is a udhaar khata: customers, "Diye" (gave), "Mile" (received), plus daily sale and kharcha. "Payments" = Mile. Stock is not built (it is not in the product scope in CLAUDE.md). Also, "Phases 1-9 below" were not included in the message, so section 7 uses a proposed list. Please send yours and I will re-map.

---

## 1. Tech stack and structure

| Part | What it is |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind, built with Vite, installable PWA (vite-plugin-pwa). No UI library, no router library. |
| Phone database | IndexedDB through Dexie. Every change is saved here first. |
| Server | Supabase (Postgres + Google login only). No custom backend code: the rules live in SQL (constraints, row-level security, 2 triggers). |
| Sync | `src/data/sync`: push (shop, customers, entries, diary), pull every 5 min, restore on a new phone. Upsert by id, so sending twice is harmless. |
| Hosting | Cloudflare Workers/Pages, auto-deploy from GitHub main. |
| Backup | GitHub Action twice a week, AES-256 encrypted file (repo is public, so never unencrypted). |
| Voice | Web Speech API (phone's own speech-to-text) + a rule-based TypeScript parser (`src/voice`). No paid API. |

Folders: `src/screens` (23 screens), `src/components` (shared UI), `src/data` (repositories, the only door to the database), `src/lib` (pure helpers), `src/voice` (parser), `src/i18n` (all text, 3 languages), `src/design` (tokens), `supabase/migrations` (0001-0004), `tests`, `scripts`.

## 2. Database review

### Tables
- `shops`: one per login (unique owner).
- `parties` (customers/suppliers): name, identifier (tells same-name people apart), phone, type, credit_limit, opening_balance, archived.
- `entries`: kind (diye / mile / opening / kharcha / cash_sale), amount, status (active/cancelled/draft), note, transcript, source, promise_date.
- `audit_log`: entity, action (create/edit/cancel), before/after JSON, actor.
- `feedback`, `error_log`: app reports (no customer data).

### How the money things are stored
| Thing | Where |
|---|---|
| Udhaar given / received | `entries` kind diye / mile |
| Old balance | `entries` kind opening (and an older column `parties.opening_balance`, see below) |
| Daily sale / expense | `entries` kind cash_sale / kharcha (no category, no customer) |
| Stock | Not stored anywhere |
| Balance | NEVER stored on the server. Worked out as opening + diye - mile (active entries only) in `src/lib/balance.ts` |

### Stored vs calculated
- Server: no stored balance anywhere. Good.
- Phone: `party_stats` holds a cached balance per customer for speed. It is updated in the SAME transaction as every entry change, can be rebuilt from entries (`statsRepo.rebuildAll`) and has a checker (`statsRepo.verify`) used in tests. It is derived data, but it is the one place a drift bug could hide (see risk 6).

### What is already strong
- Money is `bigint` whole rupees, 1 to 999,999,999, checked in SQL AND in the app. No decimals anywhere.
- No DELETE permission for any table (revoked). A trigger freezes amount, person, kind and date of a saved entry; a cancelled entry cannot come back. Audit log cannot be updated.
- Composite foreign key stops an entry pointing at another shop's customer. Row-level security limits every row to the owner.
- Create/edit/cancel and its audit line are saved in ONE phone transaction. Entry ids are made on the phone, so a retry cannot double-save.

### Gaps and proposed schema changes (all as new migrations, nothing destructive)
| # | Gap | Proposal | Priority |
|---|---|---|---|
| D1 | The audit line is written by the phone and sent as a separate request. If the entry reaches the server and the diary line does not (app killed, bad network), there is no server-side proof. | New trigger on `entries` insert/update that writes the audit row itself on the server. The phone's rows stay as the offline copy (dedupe by entity_id + action + time). | High |
| D2 | `entries.created_at` is set by the phone clock and the server accepts it. A wrong phone date puts entries on the wrong day ("Aaj ka hisaab") and in the wrong order. | Add `server_received_at` (default now()). Show a warning on the phone when its clock differs from the server's by more than a few minutes. Keep the user's date for display. | Medium |
| D3 | Balance can be changed by editing `parties.opening_balance` or `parties.type` (type flips the sign of `opening` entries). Only an audit line records it; no server guard. The UI does not allow it today, but the database does. | Trigger that blocks changing `type` and `opening_balance` once the party has entries (or requires going through an `opening` entry). | Medium |
| D4 | Two ways to store an old balance (`parties.opening_balance` and `opening` entries). Duplicated. | Keep both working (old data), stop writing the column (already so), plan to move old values into `opening` entries in one migration, then freeze the column. | Low |
| D5 | `kharcha` / `cash_sale` may carry a `party_id` in the database; the app never does. | CHECK: those kinds must have `party_id` null. | Low |
| D6 | `promise_date` only makes sense for `diye`; not enforced. `cancelled_at >= created_at` not enforced. | Two small CHECKs. | Low |
| D7 | No category on kharcha, no payment method (cash / JazzCash / bank). | Add nullable `category` and `method` only when the founder asks (V2 list). | Later |
| D8 | `credit_limit`, status `draft`, source `import` exist but nothing uses them yet. | Leave (reserved for V2). Not harmful. | None |
| D9 | Phone number format is not validated on the server (20 chars max). | Normalise to a single format in the app; CHECK on length/digits. | Low |
| D10 | Same name + same identifier twice is possible (by design, to allow same-name people). | Warn in the app ("is naam ka customer pehle se hai") instead of blocking. | Low |

## 3. Feature inventory

Status words: Working / Partially working / Broken / Duplicated / Unnecessary. "Working" = built, tested in unit tests or in the browser at 360px; real-phone checks are noted separately.

| Feature | Status | Notes |
|---|---|---|
| Google login | Working | Google app is still in "Testing" (only listed test users, max 100). Must press "Publish app" before launch. |
| Language (Roman Urdu / Urdu RTL / English) | Working | English is stored as 'ro' on the server, real choice on the phone. |
| Shop name, new-phone restore | Working | Server is asked BEFORE making a second shop. |
| Customers: add, edit, search, hide (archive) | Working | Same-name people separated by "pehchaan". |
| Old balances (Purane hisaab) | Working | See D4 (duplicated storage). |
| Diye / Mile, confirm, undo ("Wapas lo"), Badlo | Working | Badlo = cancel + new entry, both audited. |
| "Poora hisaab clear karo" | Working | |
| Customer history, cancel (audited) | Working | Cancelled entries are shown struck out. |
| Aaj ka hisaab, Sale, Kharcha | Working | Sale/kharcha are single numbers: no category, no customer, no stock. |
| Hide amounts (eye) | Working | |
| WhatsApp: reminder, statement, receipt | Partially working | Links built and tested; the direct `whatsapp://` open is unverified on a real phone. Tone choice (Naram/Sakht) is now only on the /remind screen. |
| Sunao (phone reads the balance) | Partially working | Depends on the phone having an Urdu or English voice. Hidden if not. |
| Voice entry | Partially working | See section 4. |
| Phonebook contacts | Partially working | Only Android Chrome (Contact Picker). Never works silently; needs a tap. |
| Sync / offline / restore | Working | Tested against a pretend server that follows the real rules. Real Supabase tested by hand only. |
| Backup (GitHub Action, encrypted) | Working | A restore drill from the backup file has not been rehearsed. |
| Install prompt, PWA offline shell | Working | |
| Feedback + error reports | Working | Reports hold no customer data. |
| Privacy page | Working | |
| Testing mode (separate empty database) | Working | |
| 3 looks (Bold, Warm & Desi, Calm) | Working, but maintenance cost | Every UI change must be checked 3 times. Candidate to simplify later (founder decision). |
| Voice "alias learning" | Working, niche | Useful only after repeated mis-hearing; adds code in the parser path. |
| Hidden dev pages (/dev/components, /dev/voice, /dev/crash) | Unnecessary in production | Lazy-loaded, ~14 KB, harmless. Keep for now (the /dev/voice page is needed for the diagnosis below). |
| Stock, products, suppliers' payment tracking, reports, PDF, staff login | Not built | In the V2 list in CLAUDE.md. |

No feature is "Broken" and no button is a dead end in the screens I read; nothing shows dummy data as real.

## 4. Voice entry diagnosis

### How it works
1. The phone's speech-to-text (`SpeechRecognition`, Chrome on Android) listens in `ur-PK`, then `en-IN`, then `en-US` (the one that worked last is remembered). In Chrome the audio goes to Google's servers, so it needs internet.
2. The text goes to `ruleParser` (no AI): it finds the number (digits, Roman words, Urdu words, "dedh / dhai / sawa / paune", "hazar / lakh"), the direction ("ko" = I gave, "ne" = they gave, give/receive words), the customer (matched by a vowel-free "sound shape", so Aslam / Asslam / اسلم match), and a promise date ("parson").
3. If anything is unclear it asks ONE question (amount, then direction, then customer). It never guesses. Every result goes through a confirm card.

### Test results (typed phrases, realistic Roman Urdu, Urdu script, mixed)
Understood correctly (examples): "Aslam ko 500 diye" (gave 500); "Aslam ne 500 diye" (received 500); Urdu script "اسلم کو پانچ سو روپے دیے"; "dedh hazar" = 1,500; "dhai sau" = 250; "sawa do hazar" = 2,250; "paune teen sau" = 275; "5 hazar 5 sau" = 5,500; "1 lakh"; spelling variants "Asslam", "Aslaam"; "Rashid ka hisaab clear karo" settles his whole balance; "aj ki sale 5000"; "kharcha bijli bill 3000"; "Ali ko 300" with two Alis asks which Ali.

Not understood, or asks a question (safe, but slows the shopkeeper):
| Phrase | Result | Why |
|---|---|---|
| "Aslam 500" | asks Diye or Mile | By design (founder). |
| "Aslam ko give 500 rupees", "Aslam paid 500" | asks direction | English give/paid words not in the vocabulary. |
| "Aslam ko dene hain 500" | asks direction | "dene hain" meaning is undecided (my recommendation: treat as "Dene hain", the supplier balance). |
| "Aslam ko 2 kilo chawal 600 ke diye" | asks which amount | Quantity "2" competes with price "600". There is no product/quantity parsing at all. |
| "Aslam ko chini aur chawal 1200 ke diye" | asks "naya naam hai: Aslam Chini Chawal?" | Goods words not in the small list become part of a name. |
| "Aslam ko 500 diye aur Bilal ne 300 diye" | asks which amount | Two entries in one sentence not supported. |
| "Aslam ko 500 diye parson wapas dega" | asks direction | "wapas" conflicts with "ko ... diye" (kept as a question on purpose). |
| "kal" meaning yesterday | read as tomorrow (promise date) | Not handled as a past date. |

Parsing logic is therefore NOT the main weakness for the common sentence "Name + amount + diye/mile".

### Why voice fails for real shopkeepers (diagnosis)
Ranked by how likely it is the real cause (the real cause cannot be confirmed without a recording from the phone: please send the /dev/voice screenshot):
1. **Speech-to-text quality, not our parser.** Chrome's `ur-PK` engine often writes Urdu names and numbers in unexpected spellings, or turns "Aslam 500" into words/other numbers. Names are the weakest part. Our parser fixes spellings it can, but cannot fix a completely wrong word.
2. **Internet.** Chrome sends audio to Google. Weak data = "nothing heard" or long waits. Load shedding makes this worse.
3. **Noise and accents.** Shop noise, fans and traffic reduce accuracy; nothing in our code can improve the audio.
4. **Mixed language.** Roman Urdu has no standard spelling; the engine chooses either Urdu script or English words. We accept both, but English-only engines (en-IN) mishear Urdu words.
5. **Phone differences.** Some Android builds never send the "end" event, or stop early. Fixed protectively in Nov 2026 (it can no longer get stuck), but the root cause was never reproduced.
6. Name matching is limited to customers and chosen phonebook contacts. An unknown name always becomes a question.

### Recommendation: KEEP, but as an optional shortcut, not the main path
- The manual path (customer, keypad, Theek hai) is already complete and fast (3 taps), so voice must never be required. Keep voice behind the mic button; hide it if unsupported (already done).
- Improve reliability in this order: (a) read /dev/voice results from the real phone and add the real spellings to the vocabulary and tests; (b) add English give/receive words and decide "dene hain"; (c) speak the heard amount back (Sunao) before saving, so a wrong number is noticed by ear; (d) two entries in one sentence and "kal" as yesterday, only if recordings show shopkeepers say them.
- Do NOT add a paid speech or AI service now. If accuracy is still poor after (a)-(c), a Claude/Whisper-style parser is possible, but it costs money per use and needs internet: I will give you the exact cost and free options first, before building anything.
- Do not disable voice: the typed-sentence and manual fallbacks already protect the khata, and voice is the product's main difference.

## 5. Financial accuracy risks

| # | Risk | Today | Level | Fix |
|---|---|---|---|---|
| 1 | Entries only on the phone are lost if Chrome site data is cleared or the phone is lost before sync | Sync runs on every change when online; the status line shows "Internet aate hi save hoga" | High | Make un-synced entries more visible (count), warn before logout/clear, ask for sync before testing mode and logout (partly done). |
| 2 | Duplicate transactions | Safe against retries (client UUID, upsert) and double taps (saving flag). A shopkeeper can still save the same real entry twice by mistake | Medium | "Same customer, same amount, in the last 2 minutes: save again?" confirm. |
| 3 | Balance drift in the phone cache `party_stats` | Updated in the same transaction; tested; rebuildable | Medium | Run `statsRepo.verify` after every pull and quietly rebuild on mismatch; add the check to a hidden "Hisaab check" in Settings. |
| 4 | Missing audit history | Entries, customers, shop are audited. The server does not write its own audit line (D1) | Medium | D1 trigger. |
| 5 | Unsafe deletes | None possible through the app or the API (DELETE revoked). Only internal sync cleanup deletes a local shop row and a cache table. The dashboard / service-role key can still delete | Low | Keep the service-role key secret; the encrypted backup is the safety net; rehearse a restore. |
| 6 | Floating-point money | None: integers only; server bigint; `Number()` on read is safe far above the 999,999,999 limit | Low | Add a test that fails if a decimal ever enters. |
| 7 | Validation | Amount 1 to 999,999,999 integer (app + SQL); names, notes, phone lengths checked in SQL | Low | D5, D6, D9. |
| 8 | Wrong phone clock | Server accepts the phone's time | Medium | D2. |
| 9 | Voice saves a wrong amount | A confirm card with a huge amount is always shown; "Wapas lo" for 10 s; cancel anytime | Medium | Speak amount back (section 4). |
| 10 | Two phones editing the same customer's name/phone | Last write wins for customer rows; entries cannot conflict (immutable) | Low | Acceptable for one shop per login. Revisit with staff login (V2). |
| 11 | Launch blocker: Google app not published | Only test users can log in | High (for launch) | Press "Publish app" after the privacy page and home link (in docs/LAUNCH_CHECKLIST.md). Needs your OK. |

## 6. Mobile performance

Measured on the production build now (gzip in brackets):
- First screen JavaScript: main 228 KB (71.8) + shared components 62 KB (21.8) + signed-in app 76 KB (18.9) + local database/Dexie 104 KB (33.9) = about 146 KB gzip. CSS 28 KB (6.6).
- Loaded only when needed: Supabase 214 KB (55) after login; voice parser 18 KB (7.7) + voice screen 19 KB (5.8) only when the mic is tapped; dev pages 14 KB.
- Service-worker precache: 27 files, 887 KiB (includes the Urdu font and icons). First install downloads about that much once.
- Images: only app icons (no large images, no photos).
- Earlier measurement (CLAUDE.md): on a 12x slower CPU with 1,000 customers and 20,000 entries, every step is under 1.7 s. Lists draw 60 at a time. Home never reads all entries.
- Sync reads pages of 1,000 rows (so servers' default row limit cannot cut data).
- Unverified: real 2 GB Android, unnecessary re-renders (no profiling done; the live-query hooks in `src/data/useLive.ts` are the place to look), battery/CPU while listening.
- Possible savings: the chunk named "aliasStore" (104 KB) is really the shared local-database code; Supabase could stay out until the first sync is needed; self-hosted Urdu font should only be fetched in Urdu mode. All optional.

## 7. Roadmap mapping

Your message said "Phases 1-9 below" but they were not in it. Below is my proposed list from this audit, with what is already done. Tell me your real list and I will line it up.

| Proposed phase | Content | Already done |
|---|---|---|
| 1. Financial safety | D1 server audit, D2 clock check, D3 guards, D5/D6/D9 checks, duplicate-entry warning, cache verify after sync, restore drill | Partly: no deletes, frozen entries, audit in same transaction, cancel-only |
| 2. Voice reliability | Real recordings into tests, English words, "dene hain", speak-back before save | Parser, never-stuck fixes, manual fallbacks, contact matching |
| 3. Daily money control | Kharcha categories, payment method, "Galla milao" (cash count), edit sale/kharcha | Sale, kharcha, Aaj ka hisaab |
| 4. Customer risk and recovery | Credit limit warning, promise-date reminder list, risky-customer list | Promise date saved, reminder via WhatsApp, credit_limit column |
| 5. Stock (only if you want it) | Products, quantity, stock in/out, low-stock | Nothing. Needs your product decision first, because it makes the app heavier for shopkeepers |
| 6. Reports and sharing | PDF statement, month view, customer read-only link | WhatsApp statement text |
| 7. Staff and multi-device | Staff login, roles, conflict rules | Single owner login |
| 8. Launch readiness | Publish Google app, contact email, real-phone test on cheap Android, custom domain if Google refuses workers.dev (about Rs 3,000-4,000 per year: needs your OK first) | Privacy page, backups, feedback, error reports, checklist |
| 9. Speed and polish | Re-render profiling on a 2 GB phone, trim the 3 looks, icon for the indigo look | Lazy loading, big-khata work |

## 8. Top risks (short list)
1. Unsynced entries lost with the phone (risk 1).
2. Voice accuracy on real phones is unknown (needs the /dev/voice screenshot and a few real recordings).
3. Server has no audit of its own and trusts the phone's clock (D1, D2).
4. Google login limited to test users until "Publish app".
5. Everything on a real Android phone is unverified (Contact Picker, WhatsApp open, speed).

## 9. What I need from you to start Phase 1
1. Your list of Phases 1-9 (or approve my proposed list in section 7).
2. A decision on stock/products (phase 5): build or not.
3. The /dev/voice screenshot from the phone.
4. Decision on "dene hain" (my recommendation: Dene hain / supplier balance).

Nothing in this plan costs money. Items that could cost money are marked and will be asked about first.
