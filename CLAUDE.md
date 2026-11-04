# HisabView: project memory

## Who I am
I am a non-technical founder in Karachi. Explain everything simply, in short numbered steps. Never assume I know technical terms; explain any term the first time you use it.

## Product
HisabView is a mobile-first PWA: a voice-first digital udhaar khata for small shopkeepers (kiryana, chai/paratha stalls, small food outlets, general stores) in Pakistan.
Pain points: embarrassment asking for money, disputes ("maine to paise de diye the"), same-name customers (three "Ali"s), forgetting entries during rush, low literacy / weak eyesight, lost phone = lost records, customers seeing the screen, cheap Android phones, bad internet, load shedding.

## Non-negotiable UX rules
- NO accounting jargon (never: debit, credit, ledger, receivable, payable). Use: "Diye" (gave), "Mile" (received), "Lene hain" (to collect), "Dene hain" (to pay).
- Red = money went out / customer owes. Green = money came in. Red/green are ONLY for money meaning.
- Every common task in 3 taps or fewer. One main action per screen.
- Tap targets min 56px. Big bold numbers. High contrast (readable in sunlight). Key actions near the bottom (one-hand use).
- Languages: Roman Urdu (default) and Urdu (proper RTL). Chosen on first launch, changeable in settings. ALL UI text lives in one translations file. No hardcoded strings in components.
- Every entry confirmed before saving. Every entry can be undone.
- Financial records are NEVER hard-deleted. Cancel = status 'cancelled' + audit log.
- Haptic vibration + short sound on successful save.
- Must run smoothly on a 2 GB RAM Android with Chrome. Small bundle. No heavy UI libraries.
- No ads, no unnecessary notifications, no signup forms beyond shop name.
- "1-minute test": a shopkeeper with zero instructions completes first entry within 1 minute.
- Amounts: PKR integers only. Display "Rs 2,500". Timezone Asia/Karachi.

## Visual design rules
- Premium, friendly, trustworthy, modern. Never sacrifice ease for looks.
- One calm primary brand colour (not red/green), one accent, neutral greys, red/green for money only.
- All colours, spacing, radius, font sizes, shadows defined as tokens in ONE place (src/design/tokens.ts + tailwind.config).
- Fonts: system font stack for Roman Urdu. Noto Naskh Arabic (subset, self-hosted, font-display: swap) for Urdu. Not Nastaliq.
- Cards: 16px radius, generous spacing, soft shadows. Simple filled large icons (inline SVG, no icon library).
- Friendly empty states with a small inline SVG illustration and one clear button.
- Animations under 300ms; disabled when prefers-reduced-motion.
- Must look great at 360px width.
- After the visual style is chosen in Phase 0.5, record it in a "Chosen style" section of this file and follow it everywhere.

## Style decisions (founder approved)
- Three styles exist as mockups in public/design (generator: tools/design/build.mjs): Calm & Clean, Bold & Bright, Warm & Desi.
- One style is the default. The other styles are optional and chosen per user in Settings only (never on first launch; first launch asks only for language). All styles use the same token structure in src/design/tokens.ts, and money colours must pass WCAG AA in every style.
- "Lene hain" amount is RED (customer owes). "Dene hain" amount is neutral dark, not coloured.
- Large amounts (lakh-style grouping such as 1,24,500 vs 124,500) are undecided for now; revisit later.

## Chosen style: Warm & Desi (default, chosen in Phase 0.5)
Reference mockups: public/design/desi-*.html (live at /design/desi-home.html etc). Exact values live in tools/design/build.mjs under `desi`. Follow them everywhere.
- Personality: friendly, familiar, premium. Chai-brown header, marigold highlights, soft jali (diamond lattice) pattern used lightly (header, small card corners, voice transcript card only). Never cluttered.
- Colours: primary chai-brown #4A2A14 (text on it #FFF6E5); accent marigold #F0A500 (text on it #2B1A0E); page cream #FBF4E6; surface #FFFDF8; ink #2B1A0E; soft ink #6B5240; line #EADCC4; soft primary #F5E6CB.
- Money colours (only for money): out/red #A8261C on soft #FBE3DD; in/green #1E6B2E on soft #E2F0DC. Red/green buttons use white text. All pairs pass WCAG AA (checked by the build script).
- "Lene hain" amount red, "Dene hain" amount ink (neutral).
- Shape: card radius 18px, button radius 16px, soft brown shadow `0 3px 14px rgba(74,42,20,.10)`, 1.5px line borders on cards.
- Type: system font; amounts weight 800, size min(27px, 7.6vw) in half-width cards, 64px for the confirmation amount; names 18-19px bold. Urdu: Noto Naskh Arabic with small text bumped about 2px.
- Home layout: brown header with shop name + eye (hide amounts) button; two total cards; "Aaj ka hisaab" card with a 56px WhatsApp button; recent entries; bottom dock = red Diye, big marigold mic (raised, double ring), green Mile, with a scalloped top edge.
- Confirmation screen: transcript card, result card (name + identifier, Diye chip, huge amount, new balance), bottom buttons "Badlo" (outlined) and "Theek hai" (brown, marigold text). Theek hai is NOT green, because green means money.
- Hidden amounts: show "Rs ***" in neutral ink; a 56px marigold banner explains how to show them again.
- Direction is also shown by an arrow icon (up = Diye, down = Mile), so meaning never depends on colour alone.
- Other two styles (Calm & Clean, Bold & Bright) stay available as optional per-user choices in Settings, built later using the same tokens structure.

## Design system in code (built in the "design system" chunk)
- Tokens: src/design/tokens.ts (the only place for colours, spacing, radius, font sizes, shadows, motion). tailwind.config.ts reads it. Never type a hex colour or pixel size inside a component.
- Text: src/i18n/translations.ts (add one line with both languages) and `const { t } = useT()` from src/i18n/i18n.tsx. Urdu sets dir="rtl" on the page. Use logical classes (ps-/pe-/ms-/me-, text-start) and `rtl:` variants; never left/right.
- Components in src/components: BigButton, AmountText, Card, ScreenHeader, BottomActionBar, Snackbar, NumberKeypad, EmptyState, SaveSuccess (+TickBadge), Icon, IconButton (+HideAmountsButton), MicButton, TextField, SearchBar, ChoiceCard, Chip, PartyRow, BottomNav (+NavTabs), Sheet, SwitchRow, HideBanner. Build screens only from these.
- Money: always <AmountText> (it hides itself when "hide amounts" is on and shrinks very big numbers to fit). Use reveal only where the shopkeeper types the amount.
- Pages that use BottomActionBar add pb-[var(--bar-h)] so nothing hides behind it.
- Dev gallery: /dev/components (hidden, lazy-loaded). Update it whenever a component changes.
- Screenshot helpers live outside the repo; the UI quality process above still applies to every screen.

## Data layer (built in the "data foundation" chunk)
- SQL lives in supabase/migrations (0001 tables, 0002 security). Run in Supabase SQL Editor in order. Money = whole rupees (bigint, 1 to 999,999,999). No DELETE rule exists on any table. A saved entry can only be cancelled (a database trigger freezes amount, person, kind, date). audit_log is add-only.
- "Badlo" on an entry = cancel the old one and add a new one (both audited). Opening amount lives in parties.opening_balance; the 'opening' entry kind is reserved and does not change balances.
- Phone database: src/data (Dexie). Screens use ONLY `src/data/index.ts` repositories: shopsRepo, partiesRepo, entriesRepo, auditRepo. Never import Dexie or Supabase in a screen.
- Every phone row has pending_sync (1 = not yet sent to the server). The sync engine is Phase 4.
- Each create/edit/cancel saves its audit row in the SAME Dexie transaction.
- Who is logged in: src/state/auth.tsx (Google only) fills src/data/context.ts. Supabase is lazy-loaded (src/lib/supabase.ts) to keep the first screen small.
- Balance: src/lib/balance.ts (pure). balance = opening + diye - mile, active entries only. Tests: `npm test`.

## Screens and flow (built in the "onboarding" and "parties" chunks)
- src/App.tsx: language (first launch only, two big cards) -> Google login -> lazy SignedInApp (src/SignedInApp.tsx): shop name -> done -> optional "Purane hisaab" -> Home. A person with a shop goes straight to Home.
- Screens live in src/screens. Tiny router in src/lib/router.ts (navigate, goBack, usePath, flash for "Wapas lo" between screens). No router library.
- Home = totals + sticky search + party list (highest balance first). /party/new, /party/:id, /party/:id/diye, /party/:id/mile.
- Old balances ("Purane hisaab") are 'opening' entries. "Wo mujhe dene hain" = customer (balance +), "Mujhe unhe dene hain" = supplier (balance -). Balance: src/lib/balance.ts. Positive = Lene hain (red). Negative = Dene hain (neutral ink, NOT green).
- Disabled placeholders (Yaad dilao, Hisaab bhejo, Sunao) are real disabled buttons with a "jald" tag.
- Main tabs (BottomNav): Home (/), Customers (/customers), Settings (/settings). Detail screens have their own bottom bar and no tabs. Home dock = Diye / mic / Mile above the tabs. Mic opens a "Voice jald" sheet until Phase 2.
- Writing an entry: Home Diye/Mile -> /entry/:kind (pick customer, recent first) -> /party/:id/:kind (amount -> check card with optional note -> Theek hai). After saving we return to where the flow started (beginFlow/finishFlow in router.ts) with "Wapas lo" for 10 s (useEntrySnack). Wapas lo = cancel + audit.
- Cancel from a customer's history: tap entry -> "Cancel karo" -> "Haan, cancel karo". Never deleted.
- Hide amounts: eye on Home/Customers + switch in Settings, saved in localStorage, shows "Rs ***" plus a marigold banner. Typed amounts always show. New balance on the check card stays hidden.
- "Aaj ka hisaab" uses Pakistan day (UTC+5). WhatsApp button there is disabled until Phase 3.
- Settings: language (also saved on the shop, audited), hide amounts, shop name (audited), logout (asks first). Hidden customers can be brought back from the Customers tab.
- Contact Picker only appears where the phone supports it (src/lib/contacts.ts).

## Voice parser (built in chunk 2A, brain only, no screen yet)
- Code: src/voice. Screens use ONLY `src/voice/index.ts`: `ruleParser.parse(text, parties, now?)` (may be async so a Claude parser can replace it) and `questionText(q, lang)`.
- Answer is `{type:'entry', party|null, kind, amount, promise_date?, confidence, warnings?}` or `{type:'question', question, name?, options?, partial}`. `partial` keeps what was understood, so nothing is lost when a question is asked.
- Question codes: amount, which_amount, kind, who, which_party, new_party. Their words are in translations.ts (q* keys). Order of asking: amount, then kind, then customer. One question only. Never a guess.
- "ko" = the customer received (diye), "ne" + a plain give-word = the customer gave (mile). Conflicting words (for example "wapas" with "ko ... diye") ask the kind.
- Spelling: names are compared by a vowel-free "sound shape" (src/voice/match.ts), so Aslam/Asslam/اسلم match. Exactly-spelled beats sounds-alike. One sound off is allowed only with the same first sound (Kamran is not Imran). Any unknown extra word counts as part of a new name, so the parser asks "Naya naam hai?".
- Words it knows live in src/voice/vocabulary.ts (clashes throw at load). Tests: tests/voice-parser.test.ts; real shopkeeper recordings go in tests/real-sentences.test.ts.
- Not understood yet: two entries in one sentence, "kal" meaning yesterday as a date, "dene hain" (to pay), goods words not in the small list (they trigger the new-name question), names that are also number or kind words (for example "Das").

## Tech stack (zero running cost)
- Vite + React + TypeScript + Tailwind CSS.
- vite-plugin-pwa (manifest, service worker, installable, offline shell).
- Local-first data: IndexedDB via Dexie. All writes go to Dexie first. Client-generated UUIDs. Server sync via a queue (Phase 4).
- Supabase (Postgres + Auth). Google sign-in only. Row Level Security: each shop sees only its own data.
- Hosting: Cloudflare Pages.
- Voice in: Web Speech API ('ur-PK', fallback 'en-IN'/'en-US'). Hide mic if unsupported.
- Voice out: speechSynthesis.
- WhatsApp: wa.me deep links with prefilled text. No WhatsApp API.
- Contacts: Contact Picker API where supported, manual otherwise.
- NO paid APIs. Voice parser is rule-based TypeScript behind an interface (AI parser can be swapped in later).

## Data model
- shops: id, owner_user_id, shop_name, language, created_at
- parties: id, shop_id, name, identifier, phone, type ('customer'|'supplier'), credit_limit (nullable), opening_balance, created_at, archived
- entries: id (client UUID), shop_id, party_id (nullable), kind ('diye'|'mile'|'opening'|'kharcha'|'cash_sale'), amount, note, transcript, source ('voice'|'manual'|'import'), status ('active'|'cancelled'|'draft'), promise_date (nullable), created_by, created_at, cancelled_at
- audit_log: every create/edit/cancel with before/after values.
- Balances are ALWAYS calculated from entries, never stored as an editable number.

## V2 (do not build, but keep architecture ready)
Customer read-only balance link, promise-date reminders, draft entries ("Jaldi note"), cash reconciliation ("Galla milao"), credit limit warnings, risky-customer list, staff login, PDF statements, CSV import, expense categories, supplier accounts, Claude API parser.

## Phases (the founder gives one chunk at a time)
- Phase 0: Setup (install tools, create accounts, deploy an empty installable app)
- Phase 0.5: 3 design style options, founder chooses one
- Phase 1: Core khata (database, login, onboarding, parties, manual Diye/Mile, undo, hide amounts)
- Phase 2: Voice (parser + voice screen)
- Phase 3: WhatsApp + Aaj ka hisaab
- Phase 4: Offline sync + install prompt + speed
- Phase 5: Polish + launch prep. MUST include before launch: a privacy policy page + homepage link, then press "Publish app" in Google Auth Platform > Audience (until then only listed Test users can log in, max 100). Also decide Supabase free-plan pause (1 week idle) and backups.

## Working rules
- Secrets in environment variables only. Never commit them. .gitignore from day one.
- Git commit after every working step with a clear message.
- No placeholder code ("TODO: implement"). Finish what you start.
- Simple, readable code with short plain-English comments.
- If anything will cost money, tell me BEFORE, with the expected amount.
- If unsure about a product/design decision, ask me instead of guessing.
- If I ask for something that makes the app harder for shopkeepers, push back and explain why.
- Work only on the current chunk I give you. Do not start the next phase on your own.

## UI quality process (do this for every screen)
1. Build using only design tokens and shared components.
2. Run the app and take screenshots with Playwright at 360x800 (and 412x915), in Roman Urdu AND Urdu (RTL).
3. Look at the screenshots yourself and critique them against this checklist: alignment, spacing consistency, text overflow/cut-off, contrast, tap size >= 56px, one clear main action, numbers big and readable, RTL mirrored correctly, looks premium (not generic).
4. Fix problems and re-screenshot until it passes. Tell me what you fixed.

## End-of-chunk report (always)
1. What was built, in simple words.
2. A step-by-step test checklist for my phone (what to tap, what I should see).
3. Any decisions you need from me.
Then STOP and wait for my "OK".
