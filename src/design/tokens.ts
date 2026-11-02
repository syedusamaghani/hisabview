// All colours, spacing, radius, font sizes and shadows live here, in ONE place.
// tailwind.config.ts reads this file, so changing a value here changes the whole app.
// These are temporary values. The final style is chosen in Phase 0.5.

export const colors = {
  brand: '#0F766E', // calm teal: the main brand colour (not red/green)
  brandDark: '#115E59',
  brandSoft: '#CCFBF1',
  accent: '#F59E0B', // warm amber: used sparingly
  ink: '#111827', // main text
  inkSoft: '#4B5563', // secondary text
  line: '#E5E7EB',
  surface: '#FFFFFF',
  page: '#F6F7F9',
  // Red and green are ONLY for money meaning
  moneyOut: '#B91C1C',
  moneyIn: '#15803D',
};

export const radius = {
  card: '16px',
  button: '14px',
};

export const shadow = {
  card: '0 2px 12px rgba(17, 24, 39, 0.08)',
};

export const fontSize = {
  body: '18px',
  title: '28px',
  amount: '40px',
};

export const tapTarget = '56px';
