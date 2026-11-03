import type { Config } from 'tailwindcss';
import { colors, spacing, radius, fontSize, shadow, motion, jali, fonts } from './src/design/tokens.ts';

// Every value comes from src/design/tokens.ts. Do not type colours or sizes here.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      spacing,
      maxWidth: { app: '480px' },
      borderRadius: radius,
      fontSize,
      boxShadow: shadow,
      transitionDuration: motion,
      fontFamily: { sans: fonts.sans, urdu: fonts.urdu },
      backgroundImage: {
        jali: jali('rgba(255, 246, 229, 0.16)'),
        jaliSoft: jali('rgba(74, 42, 20, 0.05)'),
      },
      keyframes: {
        pop: { from: { transform: 'scale(0.6)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
        tick: { from: { strokeDashoffset: '16' }, to: { strokeDashoffset: '0' } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        listen: { from: { transform: 'scale(1)', opacity: '0.7' }, to: { transform: 'scale(1.5)', opacity: '0' } },
      },
      animation: {
        pop: `pop ${motion.base} ease-out both`,
        tick: `tick ${motion.slow} ease-out ${motion.fast} both`,
        slideUp: `slideUp ${motion.base} ease-out both`,
        listen: 'listen 1200ms ease-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
