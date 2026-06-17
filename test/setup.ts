import { afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hermetic test environment. Vitest does NOT auto-load .env files, and we keep
// it that way: .env.development.local holds LIVE shared secrets (Neon, Upstash,
// Anthropic, Paddle, Resend). Loading them here would let a test hit the real,
// shared Neon DB — and purgeExpired hard-deletes rows. So we assert the most
// dangerous one (DATABASE_URL) is absent and refuse to run if it leaked in.
// ---------------------------------------------------------------------------
if (process.env.DATABASE_URL) {
  throw new Error(
    '[test/setup] DATABASE_URL is set — refusing to run tests against a real DB. ' +
      'Vitest must not load .env.development.local. Unset DATABASE_URL.',
  );
}

// Safe, deterministic test config. Mock-payment + sandbox so nothing real fires.
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.ENABLE_MOCK_PAYMENT = 'true';
process.env.PADDLE_ENVIRONMENT = 'sandbox';
process.env.DISABLE_EMAIL = 'true';
process.env.CRON_SECRET = 'test-secret';
// 64 hex chars = 32-byte key, the form-encryption key shape venture-core expects.
process.env.REDIS_FORM_ENCRYPTION_KEY =
  '0'.repeat(64);

afterEach(() => {
  vi.clearAllMocks();
});
