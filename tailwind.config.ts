import type { Config } from 'tailwindcss';
import { colors, radius, shadow, fontSize, tapTarget } from './src/design/tokens.ts';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      borderRadius: radius,
      boxShadow: shadow,
      fontSize,
      minHeight: { tap: tapTarget },
      minWidth: { tap: tapTarget },
    },
  },
  plugins: [],
} satisfies Config;
