// Design tokens: ALL colours, spacing, radius, font sizes, shadows and motion live here, in ONE place.
// tailwind.config.ts reads this file, so changing a value here changes the whole app.
// Red and green are ONLY for money meaning.
//
// There are three styles (founder decision): Bold & Bright is the default, Warm & Desi and Calm & Clean
// can be chosen in Settings. Every style has the same set of tokens. The colours become CSS variables
// (see tailwind.config.ts), so switching a style is just setting `data-style` on the page, no rebuild.
// All money colours pass WCAG AA in every style (checked by tools/design/build.mjs).

export type StyleId = 'bold' | 'desi' | 'calm';
export const STYLE_IDS: StyleId[] = ['bold', 'desi', 'calm'];
export const DEFAULT_STYLE: StyleId = 'bold';

type Palette = {
  primary: string;
  primaryInk: string; // text on the primary colour
  primarySoft: string;
  accent: string;
  accentInk: string; // text on the accent colour
  page: string;
  surface: string;
  ink: string;
  inkSoft: string;
  line: string;
  moneyOut: string; // money went out / customer owes
  moneyOutSoft: string;
  moneyIn: string; // money came in
  moneyInSoft: string;
  scrim: string;
};

type Look = {
  name: string;
  colors: Palette;
  radius: { card: string; button: string };
  shadowColor: string; // "r, g, b" of the soft shadow
  chunky: boolean; // Bold: shadows are a solid ledge under the card
  jali: boolean; // Desi: the soft diamond pattern
};

export const looks: Record<StyleId, Look> = {
  bold: {
    name: 'Bold & Bright',
    colors: {
      primary: '#4A35C8',
      primaryInk: '#FFFFFF',
      primarySoft: '#ECE9FB',
      accent: '#FFB300',
      accentInk: '#14112B',
      page: '#F3F1FB',
      surface: '#FFFFFF',
      ink: '#14112B',
      inkSoft: '#4A4668',
      line: '#DAD6EE',
      moneyOut: '#C4161C',
      moneyOutSoft: '#FDE8E8',
      moneyIn: '#087238',
      moneyInSoft: '#E3F6EB',
      scrim: 'rgba(20, 17, 43, 0.55)',
    },
    radius: { card: '20px', button: '20px' },
    shadowColor: '46, 31, 148',
    chunky: true,
    jali: false,
  },
  desi: {
    name: 'Warm & Desi',
    colors: {
      primary: '#4A2A14', // chai brown
      primaryInk: '#FFF6E5',
      primarySoft: '#F5E6CB',
      accent: '#F0A500', // marigold
      accentInk: '#2B1A0E',
      page: '#FBF4E6', // cream
      surface: '#FFFDF8',
      ink: '#2B1A0E',
      inkSoft: '#6B5240',
      line: '#EADCC4',
      moneyOut: '#A8261C',
      moneyOutSoft: '#FBE3DD',
      moneyIn: '#1E6B2E',
      moneyInSoft: '#E2F0DC',
      scrim: 'rgba(43, 26, 14, 0.55)',
    },
    radius: { card: '18px', button: '16px' },
    shadowColor: '74, 42, 20',
    chunky: false,
    jali: true,
  },
  calm: {
    name: 'Calm & Clean',
    colors: {
      primary: '#0B5F5A',
      primaryInk: '#FFFFFF',
      primarySoft: '#E3F1F0',
      accent: '#F5B041',
      accentInk: '#0E1B1A',
      page: '#F6F8F8',
      surface: '#FFFFFF',
      ink: '#0E1B1A',
      inkSoft: '#475957',
      line: '#DDE6E5',
      moneyOut: '#B3261E',
      moneyOutSoft: '#FCEBEA',
      moneyIn: '#0B7A3B',
      moneyInSoft: '#E4F4EA',
      scrim: 'rgba(14, 27, 26, 0.55)',
    },
    radius: { card: '16px', button: '16px' },
    shadowColor: '14, 27, 26',
    chunky: false,
    jali: false,
  },
};

// The colours of the default style, for the few places outside the page itself (the install manifest)
export const colors = { ...looks[DEFAULT_STYLE].colors, white: '#FFFFFF' };

// Everything that changes with the style, as CSS variable values
export function styleVars(id: StyleId): Record<string, string> {
  const look = looks[id];
  const c = look.colors;
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
  const sh = look.shadowColor;
  const vars: Record<string, string> = {
    '--r-card': look.radius.card,
    '--r-button': look.radius.button,
    '--s-card': look.chunky ? `0 5px 0 rgba(${sh}, 0.14)` : `0 3px 14px rgba(${sh}, 0.10)`,
    '--s-dock': `0 -4px 18px rgba(${sh}, 0.10)`,
    '--s-btn': 'inset 0 -4px 0 rgba(0, 0, 0, 0.22)',
    '--s-btnPressed': 'inset 0 -1px 0 rgba(0, 0, 0, 0.22)',
    '--s-snack': '0 8px 24px rgba(20, 17, 43, 0.35)',
    '--s-mic': `0 0 0 5px ${c.surface}, 0 0 0 8px ${c.accent}, 0 6px 16px rgba(${sh}, 0.25)`,
    '--s-micOn': `0 0 0 5px ${c.surface}, 0 0 0 10px ${c.primary}, 0 6px 16px rgba(${sh}, 0.25)`,
    '--c-scrim': c.scrim,
    '--jali-brand': look.jali ? jali('rgba(255, 246, 229, 0.16)') : 'none',
    '--jali-soft': look.jali ? jali('rgba(74, 42, 20, 0.05)') : 'none',
  };
  for (const key of colorKeys) vars[`--c-${key}`] = rgb(c[key]);
  return vars;
}

export const colorKeys = [
  'primary',
  'primaryInk',
  'primarySoft',
  'accent',
  'accentInk',
  'page',
  'surface',
  'ink',
  'inkSoft',
  'line',
  'moneyOut',
  'moneyOutSoft',
  'moneyIn',
  'moneyInSoft',
] as const;

export const spacing = {
  tap: '56px', // smallest allowed tap target
  tapLg: '68px', // big action buttons (Diye / Mile)
  mic: '88px',
  micXL: '128px', // the big mic on the voice screen
  gutter: '16px', // side padding of every screen
};

export const radius = { pill: '999px' }; // card and button radius change with the style (CSS variables)

export const fontSize = {
  caption: '14px',
  label: '16px',
  body: '18px',
  title: '24px',
  display: '32px',
  amountS: '20px',
  amountM: 'min(27px, 7.6vw)', // fits two side-by-side cards at 360px
  amountL: '40px',
  amountXL: '64px',
};

// Animations stay under 300ms (and are switched off for "reduce motion").
export const motion = {
  fast: '120ms',
  base: '200ms',
  slow: '280ms',
};

// Soft jali (diamond lattice) pattern as a tiny inline SVG. Used lightly, only by Warm & Desi.
export function jali(stroke: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'>` +
    `<g fill='none' stroke='${stroke}' stroke-width='1'><path d='M18 2l16 16-16 16L2 18z'/>` +
    `<path d='M18 10l8 8-8 8-8-8z'/><circle cx='18' cy='18' r='2' fill='${stroke}' stroke='none'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const fonts = {
  sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  urdu: ['Noto Naskh Arabic', 'Segoe UI', 'system-ui', 'sans-serif'],
};
