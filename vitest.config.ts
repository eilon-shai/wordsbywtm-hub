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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts'],
    // venture-core ships ESM that imports the bare specifier "next/server".
    // Inline it so Vite (not Node's resolver) handles that import — Vite knows
    // next/server's export map. Without this, test-utils fails to load.
    server: {
      deps: {
        inline: ['@eilon-shai/venture-core'],
      },
    },
  },
  // Component render smokes (.test.tsx) use the automatic JSX runtime so JSX
  // compiles without a classic `import React` in every file (matches Next's
  // jsx:preserve + react-jsx handling). Harmless for the .ts unit tests.
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
