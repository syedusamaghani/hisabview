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
- Languages: Roman Urdu (default), Urdu (proper RTL) and English. Chosen on first launch, changeable in settings. English words live in src/i18n/english.ts (typed so no key can be missing); the server only stores 'ro'/'ur' for a shop, English is saved there as 'ro' (`shopLanguage`), the real choice is in localStorage hv_lang. ALL UI text lives in one translations file. No hardcoded strings in components.
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

## STYLE UPDATE (founder, Nov 2026): the default look is now Bold & Bright (indigo #4A35C8, amber accent #FFB300, lavender page, 20px radius, chunky ledge shadows, big amounts). Warm & Desi and Calm & Clean are choosable in Settings > "App ka look" (saved on the phone, localStorage hv_style). All three live in src/design/tokens.ts (`looks`); tailwind.config.ts turns them into CSS variables (:root = default, [data-style="desi"|"calm"] = the others), src/design/style.ts applies the choice with one attribute, so a restart of the dev server is needed after changing tokens. Jali pattern and the scalloped dock edge show only in Warm & Desi. The app icon is still the brown khata. Bold & Bright is MINIMAL on purpose (founder: buttons and UI felt "ajeeb"): white top bar with a thin line (tokens headerBg/headerInk/headerSub/headerLine/chipBg/chipInk), flat buttons with no ledge, quiet outlined ghost buttons (ringBtn), thin card shadow, hairline dock, plain mic, lighter font weights (font-bold = 600 and font-extrabold = 700 through CSS variables --fw-bold/--fw-heavy; Warm & Desi and Calm keep 700/800). Components must use these tokens (header tone="header" for round buttons in the top bar, text-btnInk on the primary button). The Warm & Desi details below are still the reference for that style.

## Chosen style: Warm & Desi (was the default; now an option, chosen in Phase 0.5)
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
- Every phone row has pending_sync (1 = not yet sent to the server). The sync engine (src/data/sync) sends them; see "Sync, backup and speed" below.
- Each create/edit/cancel saves its audit row in the SAME Dexie transaction.
- Who is logged in: src/state/auth.tsx (Google only) fills src/data/context.ts. Supabase is lazy-loaded (src/lib/supabase.ts) to keep the first screen small.
- Balance: src/lib/balance.ts (pure). balance = opening + diye - mile, active entries only. Tests: `npm test`.

## Screens and flow (built in the "onboarding" and "parties" chunks)
- src/App.tsx: language (first launch only, two big cards) -> Google login -> lazy SignedInApp (src/SignedInApp.tsx): shop name -> done -> optional "Purane hisaab" -> Home. A person with a shop goes straight to Home.
- Screens live in src/screens. Tiny router in src/lib/router.ts (navigate, goBack, usePath, flash for "Wapas lo" between screens). No router library.
- Home = totals + sticky search + party list (highest balance first). /party/new, /party/:id, /party/:id/diye, /party/:id/mile.
- Old balances ("Purane hisaab") are 'opening' entries. "Wo mujhe dene hain" = customer (balance +), "Mujhe unhe dene hain" = supplier (balance -). Balance: src/lib/balance.ts. Positive = Lene hain (red). Negative = Dene hain (neutral ink, NOT green).
- Yaad dilao, Hisaab bhejo and Sunao on the customer page are real buttons now (see "WhatsApp and Aaj ka hisaab" below).
- Main tabs (BottomNav): Home (/), Customers (/customers), Settings (/settings). Detail screens have their own bottom bar and no tabs. Home dock = Diye / mic / Mile above the tabs. Mic opens the voice screen (see "Voice screen").
- Writing an entry: Home Diye/Mile -> /entry/:kind (pick customer, recent first) -> /party/:id/:kind (amount -> check card with optional note -> Theek hai). After saving we return to where the flow started (beginFlow/finishFlow in router.ts) with "Wapas lo" for 10 s (useEntrySnack). Wapas lo = cancel + audit.
- Cancel from a customer's history: tap entry -> "Cancel karo" -> "Haan, cancel karo". Never deleted.
- Hide amounts: eye on Home/Customers + switch in Settings, saved in localStorage, shows "Rs ***" plus a marigold banner. Typed amounts always show. New balance on the check card stays hidden.
- "Aaj ka hisaab" uses Pakistan day (UTC+5); see "WhatsApp and Aaj ka hisaab" below.
- Settings: language (also saved on the shop, audited), hide amounts, shop name (audited), logout (asks first). Hidden customers can be brought back from the Customers tab.
- Contact Picker only appears where the phone supports it (src/lib/contacts.ts).

- "Badlo" on a SAVED entry (customer page and /today: tap entry -> Badlo): opens the entry screen with the amount and note already filled (`changeEntryPath` in EntryScreen, `?amount=&from=&note=`). Saving writes the new entry, then cancels the old one (both audited, nothing deleted).

- Customer page: "Edit karein" (/party/:id/edit: name, pehchaan, phone; audited) and "Poora hisaab clear karo" (opens the normal entry screen with the full balance filled in: Mile if they owe us, Diye if we owe them; checked before saving). "Delete" = Customer chhupayein (archive), never a real delete.
- Testing mode (Settings > Testing, src/data/testMode.ts): flag `hv_testing` in localStorage. ON wipes the separate Dexie database `hisabview_testing`, switches to it and reloads; a test shop is made automatically; `sync` becomes a do-nothing object (nothing goes to the internet); aliases use `hv_aliases_test`; Backup card and SyncBadge are hidden; a marigold TestBanner on every screen turns it off in one tap. OFF returns to the untouched real database `hisabview`. The database is chosen once at app start (src/data/db.ts), so every switch reloads the page.

- After saving a Diye/Mile (voice or manual) for a customer with no phone number, `finishEntryFlow` (src/lib/phoneAsk.ts) opens /party/:id/link (LinkPhoneScreen): "Kya {name} aap ke contacts mein hai?" with PhoneCard (contacts button where the phone supports it, or type a number) and "Baad mein". "Baad mein" is remembered per customer (localStorage hv_phone_skip), so it asks once. The browser cannot open the phonebook by itself or search it by name: the person must tap the button, then picks the contact in the phone's own list.

- Contacts in the app (src/lib/contactBook.ts, a phonebook icon next to the eye in the Customers header (one tap opens the phone's list, a snackbar says how many were added; NOT a card and NOT on Home, founder decision), ContactsCard on Settings and the "shop is ready" screen): one tap opens the phone's own chooser with many contacts (Contact Picker API, Android Chrome only, there is a "select all"); the chosen name+number pairs are kept ONLY in localStorage `hv_contacts` (never synced; the privacy page says so). Used as suggestions: "Naya naam hai" and "Kis ka hisaab?" questions (sound match via src/voice/contactMatch.ts; one tap makes the contact a customer WITH its number), Add customer (chips while typing), and the "contacts mein hai?" screen. A browser can never read the whole phonebook silently or without a tap; the app cannot do it either.

## Voice parser (built in chunk 2A, brain only, no screen yet)
- Code: src/voice. Screens use ONLY `src/voice/index.ts`: `ruleParser.parse(text, parties, now?)` (may be async so a Claude parser can replace it) and `questionText(q, lang)`.
- Answer is `{type:'entry', party|null, kind, amount, promise_date?, confidence, warnings?}` or `{type:'question', question, name?, options?, partial}`. `partial` keeps what was understood, so nothing is lost when a question is asked.
- Question codes: amount, which_amount, kind, who, which_party, new_party. Their words are in translations.ts (q* keys). Order of asking: amount, then kind, then customer. One question only. Never a guess.
- "ko" = the customer received (diye), "ne" + a plain give-word = the customer gave (mile). Conflicting words (for example "wapas" with "ko ... diye") ask the kind.
- Spelling: names are compared by a vowel-free "sound shape" (src/voice/match.ts), so Aslam/Asslam/اسلم match. Exactly-spelled beats sounds-alike. One sound off is allowed only with the same first sound (Kamran is not Imran). Any unknown extra word counts as part of a new name, so the parser asks "Naya naam hai?".
- "Hisaab clear karo" (words clear / saaf / khatam / barabar / chukta, Roman and Urdu): no amount is said, so the parser settles the whole balance. For this the screen passes each customer's balance (`ParserParty.balance`). They owe us: Mile for the full balance. We owe them: Diye. Balance zero: question `settled` ("pehle se saaf hai"), never an empty entry. A said amount always wins. The amount question also has a "Poora hisaab: Rs X" button when the customer has a balance.
- Learning from corrections: when the phone mis-hears a name and the shopkeeper corrects the customer, then presses Theek hai, the heard name words are saved as an alias for that customer (`src/voice/aliases.ts`, stored only in localStorage `hv_aliases` via `aliasStore.ts`, max 5 per person, never sent to the server). Next time `findAlias` (match.ts) finds the person. Safety: nothing is learned if the heard name is a fine spelling of the chosen customer or fits ANOTHER customer; a customer who really has that name is never overridden; a second unknown word in the sentence disables the alias. Settings shows "Awaaz ki yaad" with "Sab bhool jao". Settings imports aliasStore directly (not voice/index) so the parser stays out of the main bundle. The "Naya naam hai" question also offers look-alike customers and "Ye purana customer hai" (search), so correcting a mis-heard name never creates a duplicate.
- Words it knows live in src/voice/vocabulary.ts (clashes throw at load). Tests: tests/voice-parser.test.ts; real shopkeeper recordings go in tests/real-sentences.test.ts.
- Not understood yet: two entries in one sentence, "kal" meaning yesterday as a date, "dene hain" (to pay), goods words not in the small list (they trigger the new-name question), names that are also number or kind words (for example "Das").

## Voice screen (built in chunk 2B)
- The mic tap on Home first asks for the phone's contacts (`askForContacts`, src/lib/contactBook.ts): only where the Contact Picker exists, only while no contacts are added, and a closed chooser is not repeated for a week (hv_contacts_later). The browser only allows this on a tap and shows its own chooser (no silent access, no saved permission); the voice screen always opens afterwards.
- Name + amount only ("Aslam 500", founder Nov 2026): VoiceScreen.run reads it with a temporary kind, then (1) searches the customers AND the phone contacts (notYetCustomers + similarContacts) and lists EVERY match in one "Kaunsa Aslam?" list (customers with balance first, contacts with their number, plus "Naya customer: Aslam"); a contact tapped becomes a customer with its number; (2) the check card has NO Theek hai: it shows two buttons, Diye and Mile, and tapping one saves (`kindPending` in ConfirmView). A lone customer with no phonebook match goes straight to that card. Said with a kind word, the normal Theek hai card is used.
- WhatsApp: on Android `openWhatsApp` opens the app directly (whatsapp://send, no web page), falling back to wa.me after 1.5 s; elsewhere wa.me as before. The Yaad dilao tile on the customer page opens the customer's own chat at once with the Normal reminder when they owe money and a number is saved; otherwise it opens the reminder screen (save the number / nothing owed). The tone choice (Naram/Sakht) is only on that screen now.
- Never stuck (real phone report, Nov 2026): listening stops by itself 0.7 s after a number is the last thing heard ("Usama 500" -> asks I Gave / I Got), 0.3 s after a final result, 1.3 s of silence; if the phone never sends its "end" after stop(), speech.ts finishes after 2.5 s with what it heard; a parse error or more than 8 s of "working" shows ProblemView (typing / manual buttons) and the error goes to the report outbox. ListeningView fits one screen with no scrolling (100dvh, checked at 360x560) and Ruko is always enabled (listening = stop, reading = go back).
- Home mic -> beginFlow() -> /voice (src/screens/VoiceScreen.tsx, lazy-loaded so the parser costs nothing until the mic is tapped). Views in src/screens/voice: ListeningView (brown, big ListeningMic with 3 rings, live transcript, "Ruko"), ConfirmView, QuestionView, ProblemView.
- Speech to text: src/voice/speech.ts `listen()` (Web Speech API). Language order 'ur-PK', 'en-IN', 'en-US'; the one that worked last is remembered (hv_voice_lang); only "language-not-supported" moves to the next. Auto-stops 1.6 s after the last word, gives up after 8 s of silence.
- Check card corrections (real phone test): name, Diye/Mile chip and amount are each a 56px tap with a pencil icon. Diye/Mile flips in one tap; amount opens the keypad starting from the heard amount; name opens "Kis ka hisaab?" (recent first, then A to Z, up to 8). Corrections go into `forced`, so a later re-read keeps them; the original heard sentence is still saved as the transcript. Roman and Urdu "little words" (liye, aur, saman) must exist in BOTH lists in vocabulary.ts, otherwise they become part of a name.
- Typing instead of speaking: "Likh kar batayein" on the listening screen and on every problem screen opens TypeView; the typed sentence goes through the same parser and check card. Wrong name: the "Kis ka hisaab?" question has a search box (type to find, or "Naya customer: <typed>"); the "Naya naam hai" question has an editable name box. Without any voice, Home Diye/Mile (pick customer, keypad) still works.
- Problems always end with Diye/Mile buttons (manual): unsupported (mic is hidden on Home), offline ("Voice ke liye internet chahiye, haath se likh lo"), mic permission denied, nothing heard, other.
- Questions are big tappable cards, never a text box. The amount question uses the normal NumberKeypad. Answers go back to the parser as `forced` (amount/kind/party) and the same sentence is read again.
- "Theek hai" saves with source 'voice' and the original transcript, promise_date if said; then SaveSuccess + 10 s "Wapas lo". "Badlo" opens /party/:id/:kind?amount=N (EntryScreen reads ?amount).
- Sale and kharcha are saved from the voice screen too (no customer; they show on /today).
- "Sunao" on the customer page (src/voice/speak.ts): Urdu voice -> Urdu script sentence; otherwise English (India) voice reading Roman Urdu number words (src/lib/numberWords.ts). Tile is hidden if the phone cannot speak.
- Hidden test page /dev/voice: raw text for each language setting + parser result + list of voices on the phone.
- BigButton has an `accent` variant (marigold, for brown backgrounds). New components: ListeningMic, OptionButton (shown in /dev/components).

## WhatsApp and Aaj ka hisaab (built in chunk 3)
- No WhatsApp service: `src/lib/whatsapp.ts` makes a wa.me link (Pakistani numbers become 92...; no number = WhatsApp lets the shopkeeper choose). Opened straight from a tap with `openWhatsApp`. Nothing is sent until the shopkeeper presses send in WhatsApp.
- All message words are in translations.ts (msg*, bal*, tone*), filled in by `src/lib/messages.ts`. Messages follow the app language. No accounting words.
- Yaad dilao: tile on the customer page -> /party/:id/remind (RemindScreen). A customer without a number shows `PhoneCard` (pick from contacts or type, saved on the customer once); after that the chat opens directly. Three tones (Naram, Normal, Sakht), each a big card showing the message; one tap opens WhatsApp. Customer without a phone number shows a note and WhatsApp's own chooser. Nothing owed shows a friendly line.
- Receipt: after saving a Diye or Mile the snackbar has "WhatsApp" next to "Wapas lo" (link prepared in useEntrySnack through src/screens/whatsappActions.ts). Sale and kharcha have no receipt. Tapping WhatsApp keeps Wapas lo available.
- Hisaab bhejo (customer page): last 8 active entries, oldest first, plus the balance. On Home and /today the same button sends today's summary (no number).
- Aaj ka hisaab: Home card shows four numbers (Aaj diye red, Aaj mile green, Aaj ki sale green, Aaj ka kharcha red); its title opens /today (TodayScreen) with every entry of the day (tap = cancel, never deleted), WhatsApp send, and buttons Sale / Kharcha. Totals in src/lib/today.ts (`todaySummary`, `todayEntries`). Sale and kharcha do NOT change any customer balance or the Lene/Dene totals.
- Sale and Kharcha: EntryScreen without a customer (routes /today/sale, /today/kharcha), also saved from the voice screen (source 'voice', transcript kept). They show only on /today.

## Sync, backup and speed (built in chunk 4)
- The phone is the boss: every change is saved in Dexie first (pending_sync = 1). `src/data/sync` sends it to Supabase when there is internet. Sending twice is harmless (upsert by id; the audit diary uses ignore-duplicates). Nothing is ever deleted.
- Files: remote.ts (the `Remote` interface + the Supabase adapter; errors are network / auth / rejected), mapping.ts, engine.ts (push, pull, restore, start), status.ts (state for the UI), fakeRemote.ts (a pretend server that follows our real database rules, tests only).
- Push order: shop, customers, entries, diary. A row that changed while travelling stays pending. If the server refuses a row (rule broken) only that row is parked ("blocked", shown in Settings); the rest still go. Offline failures retry later (timer with back-off, the browser "online" event, and when the app comes back to the screen).
- Pull: at app start and every 5 minutes. Changes waiting on this phone are never overwritten. Cancelled is final (a cancelled entry is never brought back). The diary is add-only. Times from the server are turned into the same ISO format as on the phone.
- Migration `supabase/migrations/0003_sync.sql` (run in Supabase SQL Editor after 0001 and 0002) adds `updated_at` so a phone downloads only what changed. The app also works WITHOUT it (downloads everything once per session).
- New phone, same Google login: SignedInApp stage 'restoring' asks the server BEFORE asking for a shop name (so a second shop is never made). Success brings back the shop, customers, entries and diary; no internet shows a retry screen. If two phones each made a shop before ever syncing, the server's shop wins and this phone's customers/entries move into it (nothing lost).
- Status line on Home ("Save ho gaya" / "Internet aate hi save hoga" / "Save ho raha hai..." / problem) = `SyncBadge`; Settings has a Backup card with "Abhi save karo". The Home tagline was replaced by the badge.
- `party_stats` (Dexie v3): per customer {balance, last_at}, updated in the SAME transaction as every entry/customer change (entriesRepo, partiesRepo, sync merges). It is derived data and can always be rebuilt (`statsRepo.rebuildAll`, checked by `statsRepo.verify`, both used in tests). Screens read balances and "recent customers" from it, never by adding up all entries. Upgrading an old phone builds it once.
- Big khata rules: Home reads only customers + summaries + 5 newest entries + today's entries (index ranges); long customer lists draw 60 at a time with "Aur dikhao" (`useLimit`) and search uses a prepared index (`buildSearch`). Measured on the production build with a 12x slower CPU, 1,000 customers and 20,000 entries: every step under 1.7 s. Never use `entriesRepo.listAll()` in a screen.
- Install: `src/lib/install.ts` catches the browser's install offer at start; `InstallCard` on Home appears after the first entry ("Baad mein" = not again for a week); Settings has "App install karein"; iPhone gets the two Safari steps.
- Test tools live outside the repo (scratchpad): sync.mjs (two pretend phones + a pretend Supabase), perf.mjs (slow CPU, big khata), offline.mjs (production build, no internet).

## Launch prep (built in chunk 5)
- Privacy policy: public page at /privacy (works without login; src/screens/PrivacyScreen.tsx; words in translations.ts, keys privacy*). Linked from the language screen, the login screen and Settings. The optional contact email comes from `VITE_CONTACT_EMAIL` (Cloudflare build variable). Do not invent facts in it: change it whenever data handling changes.
- Feedback: Settings > "Hamein batayein" (FeedbackScreen): masla / idea / shukriya + a few words. Error tracking: no outside service. `src/lib/report.ts` catches uncaught errors and React render errors (ErrorBoundary shows "Kuch gadbad ho gayi", with the khata safe on the phone). Both go through `src/lib/outbox.ts` (kept on the phone, max 50) and are sent by the sync engine (`flushOutbox`, upsert with ignore-duplicates) into Supabase tables `feedback` and `error_log` (migration 0004; add-only for the app, read in the dashboard Table Editor). Reports contain what/where/version/phone only, never customers or entries. Max 10 per session, same error counted once.
- App version (build date and time) is defined at build time (`__APP_VERSION__`), shown at the bottom of Settings and sent with every error report.
- Icon and splash: a khata (ledger) with a marigold bookmark on chai brown (public/icon.svg, icon-192/512, icon-maskable-512 with safe zone, apple-touch-icon). `Logo` component is used on the language, login, splash and error screens. Manifest has shortcuts (press and hold the icon: Diye likhein / Mile likhein). public/_headers sets security headers and cache rules (sw.js and index.html never cached long).
- Screens fade in (150 ms, opacity only, off for reduce motion) through the `animate-fade` wrapper in SignedInApp.
- Backup and keep-alive: `.github/workflows/backup.yml` (Monday and Thursday) runs `scripts/backup.mjs`: reads every table with the service-role key (GitHub secret) and saves ONE file encrypted with AES-256-GCM (passphrase secret). The repository is PUBLIC, so a backup must never be saved unencrypted. Reading the database twice a week also stops the free Supabase pause.
- Step-by-step for the founder: docs/LAUNCH_CHECKLIST.md (SQL 0003 and 0004, contact email, backup secrets, Google "Publish app" with home page and privacy links, final phone check). Possible cost: Google may refuse a workers.dev address as an authorized domain; then a custom domain is needed (about Rs 3,000-4,000 per year): ask the founder BEFORE buying.
- Hidden test pages: /dev/components, /dev/voice, /dev/crash (breaks on purpose).

## Tech stack (zero running cost)
- Vite + React + TypeScript + Tailwind CSS.
- vite-plugin-pwa (manifest, service worker, installable, offline shell).
- Local-first data: IndexedDB via Dexie. All writes go to Dexie first. Client-generated UUIDs. Server sync via pending_sync flags (src/data/sync).
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
