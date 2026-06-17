import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Thin in-process integration + unit test layer. Node env only (no jsdom).
// `@` alias mirrors tsconfig paths so app imports resolve with zero plugins.
// IMPORTANT: do NOT add any dotenv/envDir config here — Vitest must never load
// .env.development.local (live shared secrets). test/setup.ts asserts that.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
