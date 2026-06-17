import { defineConfig, devices } from '@playwright/test';

// ---------------------------------------------------------------------------
// Thin Playwright browser layer for the wordsbywtm-hub collection app.
//
// Scaffolding mirrors the sibling vocalvow-app harness (config shape, dev-server
// wiring, redis global-setup, mock-payment env). The SPECS are custom — this is
// a multi-actor collection app (organizer + N contributors → one synthesis),
// not a single-shot speech product, so the venture-core e2e registrar does NOT
// apply here.
//
// Two tiers live under e2e/:
//   - smoke.spec.ts             — render/hydration smoke. Safe. NO DB writes.
//   - collection-happy-path.spec.ts — full mutating flow. SKIPPED unless
//                                 E2E_ALLOW_DB_WRITES=1 (needs a throwaway DB).
//
// Vitest owns src/**/*.test.ts + test/**/*.test.ts (see vitest.config.ts).
// Playwright's testDir is './e2e', so the two layers never collide.
// ---------------------------------------------------------------------------

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  // Synthesis (Tier B) can take up to ~60s — allow 120s per test.
  timeout: 120_000,
  expect: { timeout: 15_000 },

  projects: [
    // ── Layer 1: mock payment (local dev server, port 3005) ──────────────
    {
      name: 'mock',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3005',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
  ],

  // Boots the app's mock dev server. MUST be `next dev` (npm run dev), NOT
  // `next start` — production mode bakes env vars at build time, so
  // ENABLE_MOCK_PAYMENT would never be seen by the running server.
  // DISABLE_EMAIL + NEXT_PUBLIC_DISABLE_ANALYTICS keep the test server from
  // sending real email or firing analytics.
  webServer: {
    command:
      'ENABLE_MOCK_PAYMENT=true DISABLE_EMAIL=true NEXT_PUBLIC_DISABLE_ANALYTICS=true npm run dev',
    url: 'http://localhost:3005',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
