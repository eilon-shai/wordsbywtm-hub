import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { dbMockFactory } from '../../../../../test/helpers/mock-db';
import { redisMockFactory, emailMockFactory, resetMocks, fakeRedis, sentEmails } from '../../../../../test/helpers/mocks';
import { resetStore, seedCollection } from '../../../../../test/helpers/store';
import { hashForKey } from '@/lib/rate-limit';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());
vi.mock('@eilon-shai/venture-core/email', () => emailMockFactory());

import { POST as resendLink } from './route';

beforeEach(() => {
  resetStore();
  resetMocks();
});

describe('resend-link — always generic ok (no existence oracle)', () => {
  it('{ok:true} for an invalid email, no send', async () => {
    const res = await resendLink(makeRequest({ email: 'bad', occasion: 'memorial' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(sentEmails.length).toBe(0);
  });

  it('{ok:true} for an unknown occasion, no send', async () => {
    const res = await resendLink(makeRequest({ email: 'a@example.com', occasion: 'nope' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(sentEmails.length).toBe(0);
  });

  it('does not send a second time within the rate-limit hour (incr n>1)', async () => {
    process.env.DISABLE_EMAIL = 'false';
    try {
      seedCollection({ occasion: 'memorial', organizerEmail: 'org@example.com' });
      // Pre-seed the per-email rate-limit counter so incr -> 2. The key hashes the
      // email so no raw PII lands in Redis (SES-047 §7 [LOW]).
      const key = `wtm-memorial:resend:memorial:${hashForKey('org@example.com')}`;
      await fakeRedis.set(key, 1);
      const res = await resendLink(makeRequest({ email: 'org@example.com', occasion: 'memorial' }));
      expect(await res.json()).toEqual({ ok: true });
      expect(sentEmails.length).toBe(0); // rate-limited within the hour → no send
    } finally {
      process.env.DISABLE_EMAIL = 'true';
    }
  });

  it('the resend Redis key contains no raw email (hashed PII)', async () => {
    process.env.DISABLE_EMAIL = 'false';
    try {
      seedCollection({ occasion: 'memorial', organizerEmail: 'org@example.com' });
      await resendLink(makeRequest({ email: 'org@example.com', occasion: 'memorial' }));
      const keys = [...fakeRedis._store.keys()];
      const resendKeys = keys.filter((k) => k.includes(':resend:'));
      expect(resendKeys.length).toBeGreaterThan(0);
      for (const k of resendKeys) expect(k).not.toContain('org@example.com');
    } finally {
      process.env.DISABLE_EMAIL = 'true';
    }
  });

  describe('with email enabled', () => {
    beforeEach(() => { process.env.DISABLE_EMAIL = 'false'; });
    afterEach(() => { process.env.DISABLE_EMAIL = 'true'; });

    it('sends the manage link only when an open collection exists', async () => {
      seedCollection({ occasion: 'memorial', organizerEmail: 'org@example.com' });
      const res = await resendLink(makeRequest({ email: 'org@example.com', occasion: 'memorial' }));
      expect(await res.json()).toEqual({ ok: true });
      expect(sentEmails.length).toBe(1);
    });

    it('still {ok:true} with no send when no collection exists', async () => {
      const res = await resendLink(makeRequest({ email: 'nobody@example.com', occasion: 'memorial' }));
      expect(await res.json()).toEqual({ ok: true });
      expect(sentEmails.length).toBe(0);
    });
  });
});
