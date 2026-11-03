// Design tokens for the chosen style: "Warm & Desi" (see CLAUDE.md, "Chosen style").
// ALL colours, spacing, radius, font sizes, shadows and motion live here, in ONE place.
// tailwind.config.ts reads this file, so changing a value here changes the whole app.
// Red and green are ONLY for money meaning.

export const colors = {
  primary: '#4A2A14', // chai brown
  primaryInk: '#FFF6E5', // text on brown
  primarySoft: '#F5E6CB',
  accent: '#F0A500', // marigold
  accentInk: '#2B1A0E', // text on marigold
  page: '#FBF4E6', // cream
  surface: '#FFFDF8',
  ink: '#2B1A0E',
  inkSoft: '#6B5240',
  line: '#EADCC4',
  moneyOut: '#A8261C', // money went out / customer owes
  moneyOutSoft: '#FBE3DD',
  moneyIn: '#1E6B2E', // money came in
  moneyInSoft: '#E2F0DC',
  white: '#FFFFFF',
  scrim: 'rgba(43, 26, 14, 0.55)',
};

export const spacing = {
  tap: '56px', // smallest allowed tap target
  tapLg: '68px', // big action buttons (Diye / Mile)
  mic: '88px',
  gutter: '16px', // side padding of every screen
};

export const radius = {
  card: '18px',
  button: '16px',
  pill: '999px',
};

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

export const shadow = {
  card: '0 3px 14px rgba(74, 42, 20, 0.10)',
  dock: '0 -4px 18px rgba(74, 42, 20, 0.10)',
  btn: 'inset 0 -4px 0 rgba(0, 0, 0, 0.22)',
  btnPressed: 'inset 0 -1px 0 rgba(0, 0, 0, 0.22)',
  snack: '0 8px 24px rgba(43, 26, 14, 0.35)',
  mic: `0 0 0 5px ${colors.surface}, 0 0 0 8px ${colors.accent}, 0 6px 16px rgba(74, 42, 20, 0.25)`,
  micOn: `0 0 0 5px ${colors.surface}, 0 0 0 10px ${colors.primary}, 0 6px 16px rgba(74, 42, 20, 0.25)`,
};

// Animations stay under 300ms (and are switched off for "reduce motion").
export const motion = {
  fast: '120ms',
  base: '200ms',
  slow: '280ms',
};

// Soft jali (diamond lattice) pattern as a tiny inline SVG. Used lightly.
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
