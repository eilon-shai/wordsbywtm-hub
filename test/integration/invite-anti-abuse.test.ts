import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dbMockFactory } from '../helpers/mock-db';
import { redisMockFactory, emailMockFactory, resetMocks, fakeRedis, sentEmails } from '../helpers/mocks';
import { resetStore, seedCollection, store } from '../helpers/store';

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());
vi.mock('@eilon-shai/venture-core/email', () => emailMockFactory());

import { POST as invite } from '@/app/api/collection/invite/route';

// Build a request with explicit control over the content-type header.
function inviteReq(body: unknown, contentType: string | null = 'application/json') {
  const headers = new Headers();
  if (contentType) headers.set('content-type', contentType);
  return new Request('http://localhost/api/collection/invite', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    // @ts-expect-error duplex is required by Node fetch for streamed bodies
    duplex: 'half',
  }) as unknown as import('next/server').NextRequest;
}

const r = (name: string, email: string) => ({ name, email });

beforeEach(() => {
  resetStore();
  resetMocks();
});

describe('invite anti-abuse — body/content-type guards (DISABLE_EMAIL on)', () => {
  it('400 when content-type is not application/json', async () => {
    const res = await invite(inviteReq({ adminToken: 'x' }, 'text/plain'));
    expect(res.status).toBe(400);
  });

  it('400 on an unparseable JSON body', async () => {
    const res = await invite(inviteReq('not json{'));
    expect(res.status).toBe(400);
  });

  it('400 when adminToken is missing', async () => {
    const res = await invite(inviteReq({ recipients: [r('A', 'a@example.com')] }));
    expect(res.status).toBe(400);
  });

  it('400 when no valid recipients remain after EMAIL_RE filter', async () => {
    seedCollection({ occasion: 'memorial', adminToken: 'ad' });
    const res = await invite(inviteReq({ adminToken: 'ad', recipients: [r('A', 'bad'), r('B', 'also-bad')] }));
    expect(res.status).toBe(400);
  });

  it('404 when no collection matches the admin token', async () => {
    const res = await invite(inviteReq({ adminToken: 'nope', recipients: [r('A', 'a@example.com')] }));
    expect(res.status).toBe(404);
  });

  it('409 when the collection is closed', async () => {
    seedCollection({ occasion: 'memorial', adminToken: 'ad', status: 'closed' });
    const res = await invite(inviteReq({ adminToken: 'ad', recipients: [r('A', 'a@example.com')] }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('COLLECTION_CLOSED');
  });

  it('dedupes + slices to MAX_PER_REQUEST=3 and returns simulated under DISABLE_EMAIL', async () => {
    seedCollection({ occasion: 'memorial', adminToken: 'ad' });
    const res = await invite(
      inviteReq({
        adminToken: 'ad',
        recipients: [
          r('A', 'a@example.com'),
          r('A2', 'a@example.com'), // dup
          r('B', 'b@example.com'),
          r('C', 'c@example.com'),
          r('D', 'd@example.com'), // sliced off (over 3)
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.simulated).toBe(true);
    expect(body.sent).toBe(3); // a, b, c after dedup + slice
    expect(sentEmails.length).toBe(0); // DISABLE_EMAIL: nothing actually sent
  });
});

describe('invite anti-abuse — real send path (DISABLE_EMAIL off)', () => {
  beforeEach(() => {
    process.env.DISABLE_EMAIL = 'false';
  });
  afterEach(() => {
    process.env.DISABLE_EMAIL = 'true';
  });

  it('actually sends to each unique recipient and locks them per day', async () => {
    seedCollection({ occasion: 'memorial', adminToken: 'ad' });
    const res = await invite(inviteReq({ adminToken: 'ad', recipients: [r('A', 'a@example.com'), r('B', 'b@example.com')] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(sentEmails.length).toBe(2);
  });

  it('skips a recipient already emailed today (per-recipient lock)', async () => {
    const meta = seedCollection({ occasion: 'memorial', adminToken: 'ad' });
    await fakeRedis.set(`wtm-memorial:invite-rcpt:${meta.id}:a@example.com`, '1');
    const res = await invite(inviteReq({ adminToken: 'ad', recipients: [r('A', 'a@example.com'), r('B', 'b@example.com')] }));
    const body = await res.json();
    expect(body.sent).toBe(1); // only b
    expect(body.skipped).toBe(1); // a was locked
  });

  it('429 when the daily cap (12) is already exhausted', async () => {
    const meta = seedCollection({ occasion: 'memorial', adminToken: 'ad' });
    const today = new Date().toISOString().slice(0, 10);
    await fakeRedis.set(`wtm-memorial:invite-day:${meta.id}:${today}`, 12);
    const res = await invite(inviteReq({ adminToken: 'ad', recipients: [r('A', 'a@example.com')] }));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe('RATE_LIMIT');
  });

  it('the daily cap is a flat 12 — paid does NOT raise it', async () => {
    const meta = seedCollection({ occasion: 'memorial', adminToken: 'ad', paidAt: new Date().toISOString() });
    const today = new Date().toISOString().slice(0, 10);
    await fakeRedis.set(`wtm-memorial:invite-day:${meta.id}:${today}`, 12);
    const res = await invite(inviteReq({ adminToken: 'ad', recipients: [r('A', 'a@example.com')] }));
    expect(res.status).toBe(429);
  });

  it('still under the cap at 11 sent today (sends)', async () => {
    const meta = seedCollection({ occasion: 'memorial', adminToken: 'ad' });
    const today = new Date().toISOString().slice(0, 10);
    await fakeRedis.set(`wtm-memorial:invite-day:${meta.id}:${today}`, 11);
    const res = await invite(inviteReq({ adminToken: 'ad', recipients: [r('A', 'a@example.com')] }));
    expect(res.status).toBe(200);
    expect((await res.json()).sent).toBe(1);
  });

  it('a send failure releases the reserved daily slot (decr rollback)', async () => {
    const meta = seedCollection({ occasion: 'memorial', adminToken: 'ad' });
    const today = new Date().toISOString().slice(0, 10);
    const dayKey = `wtm-memorial:invite-day:${meta.id}:${today}`;
    // Make sendEmail throw once.
    const email = await import('@eilon-shai/venture-core/email');
    (email.sendEmail as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new Error('resend down');
    });
    const res = await invite(inviteReq({ adminToken: 'ad', recipients: [r('A', 'a@example.com')] }));
    expect(res.status).toBe(200);
    expect((await res.json()).sent).toBe(0); // send failed
    // INCR reserved 1, the failed send decr'd it back to 0.
    expect(Number(await fakeRedis.get(dayKey))).toBe(0);
  });
});
