// Builds the Phase 0.5 style mockups into public/design/.
// Run with: node tools/design/build.mjs
// These are static pages with fake data. They are NOT part of the real app.
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'public', 'design');
mkdirSync(join(out, 'fonts'), { recursive: true });

// ---------- 1. Design tokens for each option ----------
const options = {
  calm: {
    name: 'Calm & Clean',
    blurb: 'Deep teal, lots of white space, very quiet.',
    t: {
      primary: '#0B5F5A', primaryInk: '#FFFFFF', primarySoft: '#E3F1F0',
      accent: '#F5B041', accentInk: '#0E1B1A',
      page: '#F6F8F8', surface: '#FFFFFF', ink: '#0E1B1A', inkSoft: '#475957', line: '#DDE6E5',
      out: '#B3261E', outSoft: '#FCEBEA', in: '#0B7A3B', inSoft: '#E4F4EA',
      radius: '16px', radiusBtn: '16px',
      shadow: '0 2px 14px rgba(14,27,26,.07)', amtSize: '28px', amtWeight: 700,
    },
  },
  bold: {
    name: 'Bold & Bright',
    blurb: 'Warm indigo, strong contrast, chunky numbers.',
    t: {
      primary: '#4A35C8', primaryInk: '#FFFFFF', primarySoft: '#ECE9FB',
      accent: '#FFB300', accentInk: '#14112B',
      page: '#F3F1FB', surface: '#FFFFFF', ink: '#14112B', inkSoft: '#4A4668', line: '#DAD6EE',
      out: '#C4161C', outSoft: '#FDE8E8', in: '#087238', inSoft: '#E3F6EB',
      radius: '20px', radiusBtn: '20px',
      shadow: '0 6px 0 rgba(46,31,148,.14)', amtSize: '40px', amtWeight: 800,
    },
  },
  desi: {
    name: 'Warm & Desi',
    blurb: 'Chai-brown and marigold, soft jali pattern.',
    t: {
      primary: '#4A2A14', primaryInk: '#FFF6E5', primarySoft: '#F5E6CB',
      accent: '#F0A500', accentInk: '#2B1A0E',
      page: '#FBF4E6', surface: '#FFFDF8', ink: '#2B1A0E', inkSoft: '#6B5240', line: '#EADCC4',
      out: '#A8261C', outSoft: '#FBE3DD', in: '#1E6B2E', inSoft: '#E2F0DC',
      radius: '18px', radiusBtn: '16px',
      shadow: '0 3px 14px rgba(74,42,20,.10)', amtSize: '27px', amtWeight: 800,
    },
  },
};

// ---------- 2. WCAG AA contrast check (build fails if a pair is too weak) ----------
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
let failed = false;
for (const [key, o] of Object.entries(options)) {
  const t = o.t;
  const pairs = [
    ['ink on page', t.ink, t.page], ['ink on surface', t.ink, t.surface],
    ['inkSoft on page', t.inkSoft, t.page], ['inkSoft on surface', t.inkSoft, t.surface],
    ['out on surface', t.out, t.surface], ['out on outSoft', t.out, t.outSoft],
    ['in on surface', t.in, t.surface], ['in on inSoft', t.in, t.inSoft],
    ['out on page', t.out, t.page], ['in on page', t.in, t.page],
    ['white on out button', '#FFFFFF', t.out], ['white on in button', '#FFFFFF', t.in],
    ['primaryInk on primary', t.primaryInk, t.primary],
    ['accentInk on accent', t.accentInk, t.accent],
    ['primary on primarySoft', t.primary, t.primarySoft],
    ['primary on surface', t.primary, t.surface],
  ];
  for (const [label, fg, bg] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= 4.5;
    if (!ok) failed = true;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${key.padEnd(5)} ${label.padEnd(24)} ${r.toFixed(2)}`);
  }
}
if (failed) { console.error('Contrast check failed.'); process.exit(1); }

// ---------- 3. Inline SVG icons (filled, simple) ----------
const ICONS = {
  note: '<path opacity=".55" d="M5 3.500h14a1 1 0 0 1 1 1V5.500H4V4.500a1 1 0 0 1 1-1z"/><path fill-rule="evenodd" d="M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 2.800a3.200 3.200 0 1 0 0 6.400 3.200 3.200 0 0 0 0-6.400zM5.500 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm13 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>',
  person: '<circle cx="12" cy="8" r="4.2"/><path d="M4 20.2a8 8 0 0 1 16 0c0 .5-.4.8-.8.8H4.8c-.4 0-.8-.3-.8-.8z"/>',
  mic: '<path d="M12 14.5a3.6 3.6 0 0 0 3.6-3.6V6.6a3.6 3.6 0 0 0-7.2 0v4.3a3.6 3.6 0 0 0 3.6 3.6z"/><path d="M5.8 10.6a1 1 0 1 1 2 0 4.2 4.2 0 0 0 8.4 0 1 1 0 1 1 2 0 6.2 6.2 0 0 1-5.2 6.1V19h2.2a1 1 0 1 1 0 2H8.8a1 1 0 1 1 0-2H11v-2.3a6.2 6.2 0 0 1-5.2-6.1z"/>',
  whatsapp: '<path fill-rule="evenodd" d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l5-1.3A9.8 9.8 0 1 0 12 2.2zM8.7 7.3c.3 0 .5 0 .7.5l.8 1.9c.1.3 0 .5-.1.7l-.6.7c.9 1.7 2.100 2.700 3.800 3.500l.7-.9c.2-.2.4-.3.700-.2l1.900.9c.3.1.5.3.4.7-.2 1.100-1.100 1.800-2.200 1.700-3-.4-6-3.400-6.400-6.400-.1-1.200.5-2.100 1.600-2.700z"/>',
  eye: '<path fill-rule="evenodd" d="M12 5c4.600 0 8.300 3.100 9.800 6.700a1 1 0 0 1 0 .6C20.300 15.900 16.600 19 12 19S3.700 15.900 2.200 12.300a1 1 0 0 1 0-.6C3.700 8.100 7.400 5 12 5zm0 3.500a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7z"/>',
  eyeOff: '<path fill-rule="evenodd" d="M4.300 3.300a1 1 0 0 0-1.400 1.400l2.100 2.100A12.300 12.300 0 0 0 2.200 11.700a1 1 0 0 0 0 .6C3.700 15.900 7.400 19 12 19c1.600 0 3.100-.4 4.400-1l3.300 3.300a1 1 0 0 0 1.400-1.400zM12 5c-1 0-1.900.2-2.800.5l2.300 2.300a3.500 3.500 0 0 1 4.700 4.700l2.700 2.700a12.300 12.300 0 0 0 2.900-3.200 1 1 0 0 0 0-.6C20.300 8.100 16.600 5 12 5z"/>',
  up: '<path d="M12 4.500a1 1 0 0 1 .7.3l5.500 5.500a1 1 0 0 1-1.400 1.400L13 7.900V19a1 1 0 1 1-2 0V7.900l-3.800 3.800a1 1 0 0 1-1.400-1.400l5.500-5.500a1 1 0 0 1 .7-.3z"/>',
  down: '<path d="M12 19.500a1 1 0 0 1-.7-.3l-5.500-5.500a1 1 0 1 1 1.400-1.400L11 16.100V5a1 1 0 1 1 2 0v11.100l3.800-3.800a1 1 0 0 1 1.400 1.400l-5.500 5.500a1 1 0 0 1-.7.3z"/>',
  check: '<path d="M9.500 16.600 5.400 12.500a1.100 1.100 0 0 0-1.500 1.500l4.800 4.800a1.100 1.100 0 0 0 1.500 0L20.100 7.900a1.100 1.100 0 0 0-1.500-1.500z"/>',
  edit: '<path d="M16.900 3.800a2.100 2.100 0 0 1 3 0l.3.300a2.100 2.100 0 0 1 0 3L8.600 18.700l-4.800 1.200 1.200-4.800z"/>',
  close: '<path d="M6.300 4.900a1 1 0 0 0-1.400 1.400L10.600 12l-5.700 5.700a1 1 0 1 0 1.400 1.400L12 13.400l5.700 5.700a1 1 0 0 0 1.400-1.400L13.400 12l5.700-5.700a1 1 0 0 0-1.400-1.400L12 10.600z"/>',
};
const icon = (n, s = 24) =>
  `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[n]}</svg>`;

// ---------- 4. Text in both languages (mockup only; the real app uses src/i18n) ----------
const TEXT = {
  ro: {
    dir: 'ltr', lang: 'en',
    shop: 'Ali General Store', shopLabel: 'Dukaan',
    lene: 'Lene hain', dene: 'Dene hain', cust: '12 customer', supp: '3 supplier',
    today: 'Aaj ka hisaab', diye: 'Diye', mile: 'Mile', send: 'WhatsApp par bhejein',
    recent: 'Aakhri entries', hidden: 'Raqam chhupi hain. Dikhane ke liye tap karein',
    show: 'Raqam dikhayein', hide: 'Raqam chhupayein', mic: 'Bolein',
    heard: 'Aapne kaha', quote: '“Aslam ko 500 udhaar diya”', ok: 'Theek hai', change: 'Badlo',
    newbal: 'Naya hisaab', owes: 'lene hain', close: 'Band karein', saving: 'Pakka karein?',
    rows: [
      { n: 'Ali chai wala', i: 'Mile', k: 'in', a: 'Rs 2,500', w: 'Aaj 10:42', l: 'A' },
      { n: 'Aslam', i: 'Masjid wali gali', k: 'out', a: 'Rs 500', w: 'Aaj 10:15', l: 'A' },
      { n: 'Ali', i: 'gali 3', k: 'out', a: 'Rs 1,200', w: 'Kal 7:30', l: 'A' },
    ],
    who: 'Aslam', whoId: 'Masjid wali gali', big: 'Rs 500', bal: 'Rs 2,500',
  },
  ur: {
    dir: 'rtl', lang: 'ur',
    shop: 'علی جنرل اسٹور', shopLabel: 'دکان',
    lene: 'لینے ہیں', dene: 'دینے ہیں', cust: '12 کسٹمر', supp: '3 سپلائر',
    today: 'آج کا حساب', diye: 'دیے', mile: 'ملے', send: 'واٹس ایپ پر بھیجیں',
    recent: 'آخری اندراجات', hidden: 'رقم چھپی ہے۔ دکھانے کے لیے دبائیں',
    show: 'رقم دکھائیں', hide: 'رقم چھپائیں', mic: 'بولیں',
    heard: 'آپ نے کہا', quote: '“اسلم کو 500 ادھار دیا”', ok: 'ٹھیک ہے', change: 'بدلیں',
    newbal: 'نیا حساب', owes: 'لینے ہیں', close: 'بند کریں', saving: 'پکا کریں؟',
    rows: [
      { n: 'علی چائے والا', i: 'ملے', k: 'in', a: 'Rs 2,500', w: 'آج 10:42', l: 'ع' },
      { n: 'اسلم', i: 'مسجد والی گلی', k: 'out', a: 'Rs 500', w: 'آج 10:15', l: 'ا' },
      { n: 'علی', i: 'گلی 3', k: 'out', a: 'Rs 1,200', w: 'کل 7:30', l: 'ع' },
    ],
    who: 'اسلم', whoId: 'مسجد والی گلی', big: 'Rs 500', bal: 'Rs 2,500',
  },
};

// Money is always shown left-to-right, even inside Urdu text
const money = (txt, hidden) => `<bdi dir="ltr">${hidden ? 'Rs ***' : txt}</bdi>`;

// ---------- 5. Screens ----------
function homeScreen(L, hidden) {
  const tx = TEXT[L];
  const rows = tx.rows.map((r) => `
      <li class="row">
        <span class="av">${r.l}</span>
        <span class="who"><b>${r.n}</b><small>${r.i}</small></span>
        <span class="amt-col ${hidden ? 'mute' : r.k}"><b>${money(r.a, hidden)}</b><small>${r.w}</small></span>
      </li>`).join('');
  return `
  <header class="top">
    <div class="shop"><span class="shop-av">${icon('person', 26)}</span>
      <div><small>${tx.shopLabel}</small><b>${tx.shop}</b></div></div>
    <button class="eye" aria-label="${hidden ? tx.show : tx.hide}">${icon(hidden ? 'eyeOff' : 'eye', 28)}</button>
  </header>
  ${hidden ? `<button class="hint">${icon('eyeOff', 20)}<span>${tx.hidden}</span></button>` : ''}
  <section class="totals">
    <article class="tot"><span class="lbl">${tx.lene}</span>
      <strong class="amt ${hidden ? 'mute' : 'out'}">${money('Rs 84,500', hidden)}</strong><span class="sub">${tx.cust}</span></article>
    <article class="tot"><span class="lbl">${tx.dene}</span>
      <strong class="amt">${money('Rs 32,000', hidden)}</strong><span class="sub">${tx.supp}</span></article>
  </section>
  <section class="card today">
    <h2>${tx.today}</h2>
    <div class="today-row">
      <div><span class="k out">${icon('up', 18)}${tx.diye}</span><b class="${hidden ? 'mute' : 'out'}">${money('Rs 4,200', hidden)}</b></div>
      <div><span class="k in">${icon('down', 18)}${tx.mile}</span><b class="${hidden ? 'mute' : 'in'}">${money('Rs 6,500', hidden)}</b></div>
    </div>
    <button class="wa">${icon('whatsapp', 24)}<span>${tx.send}</span></button>
  </section>
  <section class="recent"><h3>${tx.recent}</h3><ul>${rows}</ul></section>
  <nav class="dock">
    <button class="act diye">${icon('note', 26)}<span>${icon('up', 18)}${tx.diye}</span></button>
    <button class="mic" aria-label="${tx.mic}">${icon('mic', 40)}</button>
    <button class="act mile">${icon('note', 26)}<span>${icon('down', 18)}${tx.mile}</span></button>
  </nav>`;
}

function voiceScreen(L) {
  const tx = TEXT[L];
  return `
  <header class="top slim"><span class="slim-title">${tx.saving}</span>
    <button class="eye" aria-label="${tx.close}">${icon('close', 26)}</button></header>
  <section class="card heard"><small>${tx.heard}</small><p class="quote">${tx.quote}</p></section>
  <section class="card result">
    <div class="who-big"><span class="av big-av">${tx.rows[1].l}</span>
      <div><b>${tx.who}</b><small>${tx.whoId}</small></div></div>
    <div class="kind out">${icon('up', 22)}${tx.diye}</div>
    <strong class="huge out">${money(tx.big)}</strong>
    <div class="newbal"><span>${tx.newbal}</span><b><bdi dir="ltr">${tx.bal}</bdi> ${tx.owes}</b></div>
  </section>
  <div class="spacer"></div>
  <div class="actions">
    <button class="btn ghost">${icon('edit', 22)}${tx.change}</button>
    <button class="btn main">${icon('check', 26)}${tx.ok}</button>
  </div>`;
}

// ---------- 6. Styles ----------
const jali = (c) => `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'><g fill='none' stroke='${c}' stroke-width='1'><path d='M18 2l16 16-16 16L2 18z'/><path d='M18 10l8 8-8 8-8-8z'/><circle cx='18' cy='18' r='2' fill='${c}' stroke='none'/></g></svg>`,
)}")`;

function baseCss(t) {
  return `
:root{--primary:${t.primary};--primary-ink:${t.primaryInk};--primary-soft:${t.primarySoft};--accent:${t.accent};--accent-ink:${t.accentInk};
--page:${t.page};--surface:${t.surface};--ink:${t.ink};--ink-soft:${t.inkSoft};--line:${t.line};
--out:${t.out};--out-soft:${t.outSoft};--in:${t.in};--in-soft:${t.inSoft};
--radius:${t.radius};--radius-btn:${t.radiusBtn};--shadow:${t.shadow};--amt-size:${t.amtSize};--amt-weight:${t.amtWeight};color-scheme:light}
@font-face{font-family:'Noto Naskh Arabic';font-weight:400;font-display:swap;src:url(fonts/noto-naskh-arabic-400.woff2) format('woff2')}
@font-face{font-family:'Noto Naskh Arabic';font-weight:700;font-display:swap;src:url(fonts/noto-naskh-arabic-700.woff2) format('woff2')}
*{box-sizing:border-box;margin:0}
html,body{background:var(--page);overflow-x:hidden}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:18px;color:var(--ink);-webkit-tap-highlight-color:transparent}
[lang=ur] body,[lang=ur] button{font-family:'Noto Naskh Arabic',system-ui,sans-serif;line-height:1.7}
button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
bdi{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.2}
.ic{flex:none}
.bar{display:flex;align-items:center;gap:6px;min-height:48px;padding:0 12px;background:#1f2937;color:#fff;font:600 14px/1 system-ui,sans-serif;overflow-x:auto;white-space:nowrap}
.bar a{color:#fff;text-decoration:none;padding:14px 10px;opacity:.75}
.bar a.on{opacity:1;border-bottom:3px solid #fff}
.bar .name{margin-inline-end:auto;opacity:.9;padding:14px 8px}
.bare .bar{display:none}
.app{max-width:480px;margin:0 auto;min-height:calc(100dvh - 48px);display:flex;flex-direction:column;padding:0 16px 0;position:relative}
.bare .app{min-height:100dvh}
.top{display:flex;align-items:center;justify-content:space-between;min-height:72px;padding-top:6px}
.shop{display:flex;align-items:center;gap:12px;min-width:0}
.shop small{display:block;font-size:14px;color:var(--ink-soft)}
.shop b{display:block;font-size:19px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shop-av{width:48px;height:48px;border-radius:50%;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center;flex:none}
.eye{width:56px;height:56px;border-radius:50%;color:var(--primary)}
.hint{width:100%;min-height:56px;margin-bottom:12px;padding:0 16px;border-radius:var(--radius);background:var(--primary-soft);color:var(--primary);font-size:15px;font-weight:600;text-align:start;justify-content:flex-start}
.totals{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-bottom:12px}
.tot{background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}
.lbl{font-size:16px;font-weight:600;color:var(--ink-soft)}
.amt{font-size:min(var(--amt-size),7.6vw);font-weight:var(--amt-weight);letter-spacing:-.5px;line-height:1.15;white-space:nowrap}
/* Urdu Naskh letters look smaller, so small text gets a little bigger */
[lang=ur] .lbl,[lang=ur] .k,[lang=ur] .hint{font-size:19px}
[lang=ur] .sub,[lang=ur] small,[lang=ur] .today h2,[lang=ur] .recent h3{font-size:17px}
[lang=ur] .who b,[lang=ur] .shop b{font-size:22px}
[lang=ur] .wa,[lang=ur] .act,[lang=ur] .btn{font-size:21px}
[lang=ur] .who b,[lang=ur] .who small,[lang=ur] .amt-col small,[lang=ur] .shop b,[lang=ur] .shop small{line-height:1.4}
.sub{font-size:14px;color:var(--ink-soft)}
.out{color:var(--out)}.in{color:var(--in)}.mute{color:var(--ink-soft)}
.card{background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px}
.today h2{font-size:16px;font-weight:700;color:var(--ink-soft);margin-bottom:8px}
.today-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.today-row div{display:flex;flex-direction:column;gap:2px}
.today-row b{font-size:24px;font-weight:800;line-height:1.2}
.k{display:inline-flex;align-items:center;gap:4px;font-size:15px;font-weight:700}
.wa{width:100%;min-height:56px;border-radius:var(--radius-btn);background:var(--primary-soft);color:var(--primary);font-size:17px;font-weight:700}
.recent{margin-top:16px}
.recent h3{font-size:15px;font-weight:700;color:var(--ink-soft);margin-bottom:4px}
.recent ul{list-style:none;padding:0}
.row{display:flex;align-items:center;gap:12px;min-height:64px;border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:0}
.av{width:44px;height:44px;border-radius:50%;background:var(--primary-soft);color:var(--primary);display:grid;place-items:center;font-weight:800;font-size:19px;flex:none}
.who{display:flex;flex-direction:column;min-width:0;flex:1}
.who b{font-size:18px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who small,.amt-col small{font-size:14px;color:var(--ink-soft)}
.amt-col{display:flex;flex-direction:column;align-items:flex-end;flex:none}
[dir=rtl] .amt-col{align-items:flex-start}
.amt-col b{font-size:20px;font-weight:800}
.dock{position:sticky;bottom:0;margin:auto -16px 0;padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:1fr 96px 1fr;gap:12px;align-items:center}
.act{height:68px;border-radius:var(--radius-btn);color:#fff;font-size:19px;font-weight:800;flex-direction:column;gap:0}
.act span{display:inline-flex;align-items:center;gap:2px}
.diye{background:var(--out)}.mile{background:var(--in)}
.mic{width:88px;height:88px;border-radius:50%;justify-self:center}
.spacer{flex:1}
.slim{min-height:64px}.slim-title{font-size:20px;font-weight:800}
.heard{margin-bottom:12px}.heard small{font-size:15px;color:var(--ink-soft);font-weight:600}
.quote{font-size:24px;font-weight:700;line-height:1.35;margin-top:6px}
.result{display:flex;flex-direction:column;gap:14px;align-items:flex-start}
.who-big{display:flex;align-items:center;gap:14px}
.big-av{width:56px;height:56px;font-size:24px}
.who-big b{display:block;font-size:30px;font-weight:800;line-height:1.2}
.who-big small{font-size:17px;color:var(--ink-soft)}
.kind{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border-radius:999px;background:var(--out-soft);font-weight:800;font-size:20px}
.huge{font-size:64px;line-height:1.05;font-weight:800;letter-spacing:-1.5px}
.newbal{width:100%;padding-top:14px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:2px}
.newbal span{font-size:15px;color:var(--ink-soft);font-weight:600}.newbal b{font-size:22px}
.actions{display:grid;grid-template-columns:1fr 1.6fr;gap:12px;padding:12px 0 calc(16px + env(safe-area-inset-bottom,0px))}
.btn{min-height:68px;border-radius:var(--radius-btn);font-size:20px;font-weight:800}
.btn.ghost{background:var(--surface);color:var(--primary);box-shadow:inset 0 0 0 2px var(--primary)}
.btn.main{background:var(--primary);color:var(--primary-ink)}
@media (prefers-reduced-motion:no-preference){button{transition:transform .12s}button:active{transform:scale(.97)}}
`;
}

const optionCss = {
  calm: (t) => `
.top{padding-top:8px}
.tot,.card{border:1px solid var(--line)}
.dock{background:var(--surface);border-top:1px solid var(--line);box-shadow:0 -6px 24px rgba(14,27,26,.06);border-radius:24px 24px 0 0}
.mic{background:var(--primary);color:var(--primary-ink);box-shadow:0 0 0 8px var(--primary-soft)}
.act{border-radius:16px}
.amt{font-weight:700}
`,
  bold: (t) => `
body{background:var(--page)}
.app::before{content:'';position:absolute;top:0;left:-16px;right:-16px;height:262px;background:var(--primary);border-radius:0 0 32px 32px;z-index:0}
.app>*{position:relative;z-index:1}
.totals{grid-template-columns:minmax(0,1fr)}
.tot{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"l a" "s a";align-items:center;column-gap:8px;padding:12px 16px}
.lbl{grid-area:l}.amt{grid-area:a;font-size:min(var(--amt-size),11vw)}.sub{grid-area:s}
.tot{padding:10px 16px}.top{min-height:64px}.dock{padding-top:10px;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))}.row{min-height:56px}.recent{margin-top:12px}.today-row{margin-bottom:8px}.hint{font-size:14px;margin-bottom:10px}
.top{color:#fff}.shop small{color:rgba(255,255,255,.82)}
.shop-av{background:rgba(255,255,255,.18);color:#fff}
.eye{color:#fff;background:rgba(255,255,255,.16)}
.hint{background:var(--accent);color:var(--accent-ink)}
.tot{box-shadow:0 6px 0 rgba(46,31,148,.18)}
.lbl{font-weight:700;color:var(--ink)}
.amt{font-weight:800}
.card{box-shadow:0 5px 0 rgba(46,31,148,.10);border-left:8px solid var(--accent)}
[dir=rtl] .card{border-left:0;border-right:8px solid var(--accent)}
.heard{border-left:0;border-right:0;border-inline-start:8px solid var(--accent)}
.slim{color:#fff}.slim .eye{color:#fff}
.heard small{color:var(--ink-soft)}
.app.voice::before{height:130px}
.dock{background:linear-gradient(to top,var(--page) 72%,transparent)}
.act{box-shadow:0 6px 0 rgba(0,0,0,.28);height:72px;font-size:21px}
.diye{box-shadow:0 6px 0 #7f0d11}.mile{box-shadow:0 6px 0 #04461f}
.act:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(0,0,0,.28)}
.mic{background:var(--accent);color:var(--accent-ink);box-shadow:0 0 0 6px var(--primary),0 10px 0 6px rgba(46,31,148,.35);width:92px;height:92px}
.btn.main{box-shadow:0 6px 0 #2a1d85}
.btn.ghost{box-shadow:inset 0 0 0 3px var(--primary),0 6px 0 rgba(46,31,148,.18)}
.today h2,.recent h3{color:var(--ink);letter-spacing:.2px}
.huge{font-size:72px;letter-spacing:-2px}
.kind{font-size:22px}
`,
  desi: (t) => `
.app::before{content:'';position:absolute;top:0;left:-16px;right:-16px;height:206px;background:${jali('rgba(255,246,229,.16)')} ,var(--primary);border-radius:0 0 28px 28px;z-index:0}
.app>*{position:relative;z-index:1}
.top{color:var(--primary-ink)}.shop small{color:#EBD6B0}
.shop-av{background:var(--accent);color:var(--accent-ink)}
.eye{color:var(--accent);background:rgba(255,246,229,.12)}
.hint{background:var(--accent);color:var(--accent-ink)}
.tot{border:1.5px solid var(--line);position:relative;overflow:hidden}
.tot::after{content:'';position:absolute;inset-inline-end:-20px;top:-20px;width:64px;height:64px;background:${jali('rgba(74,42,20,.08)')};border-radius:50%}
.tot>*{position:relative;z-index:1}
.card{border:1.5px solid var(--line)}
.today h2,.recent h3{display:flex;align-items:center;gap:8px;color:var(--primary)}
.today h2::before,.recent h3::before{content:'';width:10px;height:10px;background:var(--accent);transform:rotate(45deg);flex:none}
.av{background:var(--primary);color:var(--accent)}
.wa{background:var(--primary-soft);color:var(--primary)}
.dock{background:var(--surface);padding-top:22px;box-shadow:0 -4px 18px rgba(74,42,20,.10)}
.dock::before{content:'';position:absolute;inset:-9px 0 auto 0;height:10px;background:radial-gradient(circle at 10px 10px,transparent 9px,var(--surface) 10px) repeat-x;background-size:20px 10px}
.act{box-shadow:inset 0 -4px 0 rgba(0,0,0,.22);border-radius:16px}
.mic{background:var(--accent);color:var(--accent-ink);box-shadow:0 0 0 5px var(--surface),0 0 0 8px var(--accent),0 6px 16px rgba(74,42,20,.25);margin-top:-30px;position:relative;z-index:2}
.huge{font-weight:800}
.kind{border:1.5px solid var(--out)}
.heard{background:${jali('rgba(74,42,20,.045)')},var(--surface)}
.btn.main{background:var(--primary);color:var(--accent)}
.btn.ghost{box-shadow:inset 0 0 0 2px var(--primary)}
.app.voice::before{height:96px}
.slim{color:var(--primary-ink)}
`,
};

const screens = [
  ['home', 'Home'],
  ['voice', 'Voice'],
  ['hidden', 'Hidden'],
  ['urdu', 'Urdu'],
];

function page(key, screen) {
  const o = options[key];
  const L = screen === 'urdu' ? 'ur' : 'ro';
  const tx = TEXT[L];
  const body =
    screen === 'voice' ? voiceScreen(L) : homeScreen(L, screen === 'hidden');
  const bar = `<div class="bar"><a href="index.html">‹ Styles</a><span class="name">${o.name}</span>${screens
    .map(([s, label]) => `<a href="${key}-${s}.html"${s === screen ? ' class="on"' : ''}>${label}</a>`)
    .join('')}</div>`;
  return `<!doctype html>
<html lang="${tx.lang}" dir="${tx.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="${o.t.primary}">
<title>${o.name}: ${screen}</title>
<style>${baseCss(o.t)}${optionCss[key](o.t)}</style>
</head>
<body>
<script>if(/bare/.test(location.search))document.documentElement.classList.add('bare')</script>
${bar}
<main class="app ${screen === 'voice' ? 'voice' : ''}">${body}</main>
</body>
</html>`;
}

// ---------- 7. Index page ----------
const swatch = (t) => [t.primary, t.accent, t.out, t.in].map((c) => `<i style="background:${c}"></i>`).join('');
const index = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>HisabView: choose a style</title>
<style>
*{box-sizing:border-box;margin:0}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#F4F5F7;color:#111827;padding:24px 16px 40px;max-width:480px;margin:0 auto}
h1{font-size:28px;margin-bottom:6px}p.lead{font-size:17px;color:#4B5563;margin-bottom:20px}
a.opt{display:block;background:#fff;border-radius:20px;padding:20px;margin-bottom:16px;text-decoration:none;color:inherit;box-shadow:0 2px 14px rgba(0,0,0,.08);min-height:56px}
a.opt b{display:block;font-size:24px;margin-bottom:4px}a.opt span{display:block;font-size:17px;color:#4B5563;margin-bottom:12px}
a.opt .sw{display:flex;gap:8px}a.opt i{width:36px;height:36px;border-radius:50%;display:block;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}
a.opt em{display:block;font-style:normal;font-weight:700;margin-top:14px;font-size:17px}
small{display:block;font-size:15px;color:#4B5563;margin-top:8px}
</style></head><body>
<h1>Choose a style</h1>
<p class="lead">Tap one. Inside, use the top bar to see Home, Voice, Hidden amounts and Urdu.</p>
${Object.entries(options).map(([k, o], i) => `<a class="opt" href="${k}-home.html"><b>${i + 1}. ${o.name}</b><span>${o.blurb}</span><div class="sw">${swatch(o.t)}</div><em>Open ›</em></a>`).join('\n')}
<small>These are pictures of screens with fake data. Nothing here saves anything.</small>
</body></html>`;

// ---------- 8. Write everything ----------
writeFileSync(join(out, 'index.html'), index);
for (const key of Object.keys(options)) {
  for (const [s] of screens) writeFileSync(join(out, `${key}-${s}.html`), page(key, s));
}
const fontSrc = process.env.FONT_DIR;
if (fontSrc) {
  for (const w of [400, 700]) {
    copyFileSync(join(fontSrc, `noto-naskh-arabic-arabic-${w}-normal.woff2`), join(out, 'fonts', `noto-naskh-arabic-${w}.woff2`));
  }
}
if (!existsSync(join(out, 'fonts', 'noto-naskh-arabic-400.woff2'))) {
  console.error('Urdu font missing: set FONT_DIR to the @fontsource/noto-naskh-arabic/files folder.');
  process.exit(1);
}
console.log('Design mockups written to public/design/');
