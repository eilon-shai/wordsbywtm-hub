import { vi } from 'vitest';
import { createFakeRedis, type FakeRedis } from './redis-fake';

// ---------------------------------------------------------------------------
// Shared mock instances + vi.mock factories for redis / email.
//
// These are exported so tests can pre-seed redis (e.g. a txn->collection map
// written at checkout) and assert on email sends. The factories below are passed
// to vi.mock(...) in each test file. As with mock-db, vi.mock factories may
// reference values imported by this module.
// ---------------------------------------------------------------------------

export const fakeRedis: FakeRedis = createFakeRedis();

// sendEmail call log — each entry is the EmailPayload passed to sendEmail.
export const sentEmails: Array<Record<string, unknown>> = [];

export function resetMocks(): void {
  fakeRedis._store.clear();
  sentEmails.length = 0;
}

export function redisMockFactory() {
  return {
    getRedisClient: () => fakeRedis,
  };
}

export function emailMockFactory() {
  return {
    // getResendClient returns a truthy sentinel; sendEmail records the payload.
    getResendClient: () => ({ __mockResend: true }),
    sendEmail: vi.fn(async (_resend: unknown, payload: Record<string, unknown>) => {
      sentEmails.push(payload);
    }),
  };
}
