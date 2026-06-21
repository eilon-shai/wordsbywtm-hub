import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';
import { dbMockFactory } from '../helpers/mock-db';
import { apiMockFactory, resetApiFakes } from '../helpers/api-fakes';
import { redisMockFactory, resetMocks, fakeRedis, sentEmails } from '../helpers/mocks';
import { resetStore, seedCollection, store } from '../helpers/store';

// ---------------------------------------------------------------------------
// SES-047 §7 [QA] — double-usage idempotency.
//
// The founder's concerns: a payment must mark a collection paid EXACTLY ONCE
// (even if the webhook is delivered twice, or mark-paid is replayed), and a
// finalized/generated collection must never re-synthesize. We assert these
// against the stateful api-fakes via the store + response codes.
//
// The webhook route delegates to createWebhookHandler (venture-core, separately
// tested). Here we replace it with a fake that does the externally-observable
// thing the real handler does — resolve the collection from customData and mark
// it paid IDEMPOTENTLY — so double-delivery can be asserted against the store.
// ---------------------------------------------------------------------------

vi.mock('@eilon-shai/venture-core/db', () => dbMockFactory());
vi.mock('@eilon-shai/venture-core/redis', () => redisMockFactory());

// api-fakes provides the idempotent mark-paid + finalize-paid fakes used by the
// mark-paid / finalize-paid routes. We override ONLY createWebhookHandler with a
// store-aware fake (the api-fakes one is a routing echo).
const markPaidCalls: string[] = [];
vi.mock('@eilon-shai/venture-core/api', () => {
  const fakes = apiMockFactory();
  return {
    ...fakes,
    createWebhookHandler: vi.fn((config: { brand: { paddleProductId: string } }) =>
      vi.fn(async (req: NextRequest) => {
        const body = (await req.clone().json().catch(() => ({}))) as {
          data?: { custom_data?: { collectionId?: string }; customData?: { collectionId?: string } };
        };
        const collectionId =
          body?.data?.custom_data?.collectionId ?? body?.data?.customData?.collectionId;
        if (!collectionId) return NextResponse.json({ ok: true, note: 'no collectionId' });
        const meta = store.collections.get(collectionId);
        if (!meta) return NextResponse.json({ ok: true, note: 'not found' });
        markPaidCalls.push(collectionId);
        if (meta.paidAt) {
          // idempotent: already marked — do not overwrite, do not double-effect
          return NextResponse.json({ ok: true, alreadyPaid: true, product: config.brand.paddleProductId });
        }
        meta.paidAt = new Date().toISOString();
        meta.paidTxnId = `WH_${collectionId}`;
        return NextResponse.json({ ok: true, paid: true, product: config.brand.paddleProductId });
      }),
    ),
  };
});

import { POST as webhook } from '@/app/api/webhook/route';
import { POST as markPaid } from '@/app/api/collection/mark-paid/route';
import { POST as finalize } from '@/app/api/collection/finalize-paid/route';

const MEMORIAL = process.env.PADDLE_PRODUCT_ID_MEMORIAL ?? 'pro_01kv1g5d6c4b3wcr74jswnnspa';

function webhookReq(body: unknown) {
  return new NextRequest('http://localhost/api/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetStore();
  resetMocks();
  resetApiFakes();
  markPaidCalls.length = 0;
});

describe('double-usage idempotency (SES-047 §7)', () => {
  it('(a) the same transaction.completed webhook delivered twice marks paid exactly once', async () => {
    const meta = seedCollection({ occasion: 'memorial', product: MEMORIAL, status: 'open' });
    const evt = {
      event_type: 'transaction.completed',
      data: { custom_data: { product: MEMORIAL, collectionId: meta.id } },
    };

    const first = await webhook(webhookReq(evt));
    expect(first.status).toBe(200);
    const firstPaidAt = meta.paidAt;
    expect(firstPaidAt).toBeTruthy();
    const firstTxn = meta.paidTxnId;

    // Re-deliver the identical event.
    const second = await webhook(webhookReq(evt));
    expect(second.status).toBe(200);
    expect((await second.json()).alreadyPaid).toBe(true);

    // paid_at + txn unchanged — the second delivery had no effect.
    expect(meta.paidAt).toBe(firstPaidAt);
    expect(meta.paidTxnId).toBe(firstTxn);
    // Both deliveries reached the handler, but only the first wrote the effect.
    expect(markPaidCalls).toEqual([meta.id, meta.id]);
  });

  it('(b) double mark-paid with the same transactionId is idempotent (paid once)', async () => {
    const meta = seedCollection({ occasion: 'memorial', product: MEMORIAL, adminToken: 'ad', status: 'open' });
    const txn = `MOCK_${meta.id}`;
    await fakeRedis.set(`wtm-memorial:txn-collection:${txn}`, meta.id);

    const first = await markPaid(makeRequest({ transactionId: txn }));
    expect(first.status).toBe(200);
    expect((await first.json()).paid).toBe(true);
    const firstPaidAt = meta.paidAt;
    expect(firstPaidAt).toBeTruthy();
    expect(meta.paidTxnId).toBe(txn);

    // Replay the same txn.
    const second = await markPaid(makeRequest({ transactionId: txn }));
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.paid).toBe(true);
    expect(body.alreadyPaid).toBe(true); // no-op path

    // paid_at unchanged — recorded exactly once.
    expect(meta.paidAt).toBe(firstPaidAt);
  });

  it('(c) a second finalize after status is generated returns the existing result with no second synthesis/email', async () => {
    const meta = seedCollection({
      occasion: 'memorial',
      product: MEMORIAL,
      adminToken: 'ad',
      status: 'open',
      paidAt: new Date().toISOString(),
    });

    const first = await finalize(makeRequest({ adminToken: 'ad' }));
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.tribute).toBeTruthy();
    expect(firstBody.reused).toBeUndefined(); // freshly generated
    expect(meta.status).toBe('generated');
    expect(meta.generatedContent).toBe(firstBody.tribute);
    expect(sentEmails.length).toBe(1); // one tribute email

    // Finalize again — must return the SAME result, no new synthesis/email.
    const second = await finalize(makeRequest({ adminToken: 'ad' }));
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.reused).toBe(true);
    expect(secondBody.tribute).toBe(firstBody.tribute);
    expect(sentEmails.length).toBe(1); // still ONE email — no second send
  });
});
