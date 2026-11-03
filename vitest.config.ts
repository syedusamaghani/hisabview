import { defineConfig } from 'vitest/config';

// Tests run in plain Node (no browser). fake-indexeddb stands in for the phone's database.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
