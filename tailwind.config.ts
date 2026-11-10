import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { DEFAULT_STYLE, STYLE_IDS, colorKeys, spacing, radius, fontSize, motion, fonts, styleVars } from './src/design/tokens.ts';

// Every value comes from src/design/tokens.ts. Do not type colours or sizes here.
// Colours, card/button radius, shadows and the jali pattern are CSS variables, one set per style:
// the default style on :root, the others under [data-style="..."].
const rgbVar = (key: string) => `rgb(var(--c-${key}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(colorKeys.map((k) => [k, rgbVar(k)])),
        white: '#FFFFFF',
        scrim: 'var(--c-scrim)',
      },
      spacing,
      maxWidth: { app: '480px' },
      borderRadius: { ...radius, card: 'var(--r-card)', button: 'var(--r-button)' },
      fontSize,
      fontWeight: { bold: 'var(--fw-bold)', extrabold: 'var(--fw-heavy)' },
      boxShadow: {
        card: 'var(--s-card)',
        dock: 'var(--s-dock)',
        btn: 'var(--s-btn)',
        btnPressed: 'var(--s-btnPressed)',
        snack: 'var(--s-snack)',
        mic: 'var(--s-mic)',
        micOn: 'var(--s-micOn)',
      },
      transitionDuration: motion,
      fontFamily: { sans: fonts.sans, urdu: fonts.urdu },
      backgroundImage: {
        jali: 'var(--jali-brand)',
        jaliSoft: 'var(--jali-soft)',
      },
      keyframes: {
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: { from: { transform: 'scale(0.6)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        tick: { from: { strokeDashoffset: '16' }, to: { strokeDashoffset: '0' } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        listen: { from: { transform: 'scale(1)', opacity: '0.7' }, to: { transform: 'scale(1.5)', opacity: '0' } },
      },
      animation: {
        fade: `fade ${motion.fast} ease-out both`,
        pop: `pop ${motion.base} ease-out both`,
        tick: `tick ${motion.slow} ease-out ${motion.fast} both`,
        slideUp: `slideUp ${motion.base} ease-out both`,
        listen: 'listen 1200ms ease-out infinite',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': styleVars(DEFAULT_STYLE) });
      for (const id of STYLE_IDS) if (id !== DEFAULT_STYLE) addBase({ [`:root[data-style="${id}"]`]: styleVars(id) });
    }),
  ],
} satisfies Config;
