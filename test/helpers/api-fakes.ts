import { vi } from 'vitest';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store } from './store';

// ---------------------------------------------------------------------------
// Stateful fakes for the venture-core /api handler FACTORIES.
//
// We mock at the module boundary (DEC-P-001 says all handler logic lives in
// venture-core, which has its own tests). These fakes are NOT re-implementations
// of venture-core internals — they are thin stand-ins that honor the externally
// observable contracts the APP wiring depends on: occasion is taken from
// config.occasionTracked, the contributor cap (free=3 / paid=10), the paid_at
// gate before synthesis, and that finalize attempts a tribute email.
//
// Each factory closes over the ProductConfig the route hands it, so we can
// assert the route resolved the RIGHT config. We stash the last-seen config's
// redisKeyPrefix on the response body for happy-path assertions.
// ---------------------------------------------------------------------------

interface Cfg {
  brand: { redisKeyPrefix: string; paddleProductId: string };
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// create: forces occasion from the (already path-forced) body, seeds a collection.
export function createCreateCollectionHandler(config: Cfg) {
  return async (req: NextRequest) => {
    const body = await readBody(req);
    const occasion = String(body.occasion ?? '');
    const id = `created_${occasion}_${Date.now()}`;
    return NextResponse.json({
      ok: true,
      id,
      occasion, // echo so the test can assert it was forced from the path
      product: config.brand.paddleProductId,
      shareToken: `share_${id}`,
      adminToken: `admin_${id}`,
    });
  };
}

// contribute: enforces email validity, consent, dedup, cap, and closed status.
// Reads collection out of the shared store via the body shareToken so a sequence
// of route calls share state.
export function createSubmitContributionHandler(_config: Cfg) {
  return async (req: NextRequest) => {
    const body = await readBody(req);
    const shareToken = String(body.shareToken ?? '');
    const meta = [...store.collections.values()].find((c) => c.shareToken === shareToken);
    if (!meta) {
      return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    if (meta.status !== 'open') {
      return NextResponse.json(
        { error: 'Closed', code: 'COLLECTION_CLOSED', retryable: false },
        { status: 409 },
      );
    }
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email', code: 'INVALID_EMAIL', retryable: false },
        { status: 400 },
      );
    }
    if (body.consent !== true) {
      return NextResponse.json(
        { error: 'Consent required', code: 'CONSENT_REQUIRED', retryable: false },
        { status: 400 },
      );
    }
    const cap = meta.paidAt ? 10 : 3;
    const seen = (store.contributorCounts.get(meta.id) ?? 0);
    const emailSet: Set<string> = (store as unknown as { _emails?: Map<string, Set<string>> })._emails?.get(meta.id) ?? new Set();
    if (emailSet.has(email)) {
      return NextResponse.json(
        { error: 'Already contributed', code: 'ALREADY_CONTRIBUTED', retryable: false },
        { status: 409 },
      );
    }
    if (seen >= cap) {
      return NextResponse.json(
        { error: 'Collection full', code: 'COLLECTION_FULL', retryable: false, status: 'full' },
        { status: 409 },
      );
    }
    emailSet.add(email);
    const map = (store as unknown as { _emails?: Map<string, Set<string>> })._emails ?? new Map();
    map.set(meta.id, emailSet);
    (store as unknown as { _emails?: Map<string, Set<string>> })._emails = map;
    store.contributorCounts.set(meta.id, seen + 1);
    return NextResponse.json({ ok: true, count: seen + 1 });
  };
}

// moderate: flips a contribution include/exclude — just acks for wiring.
export function createModerateContributionHandler(_config: Cfg) {
  return async (req: NextRequest) => {
    const body = await readBody(req);
    return NextResponse.json({ ok: true, action: body.action ?? 'include' });
  };
}

// checkout: writes the txn->collection redis mapping (mock-payment path) and
// returns a mock transaction id.
export function createCollectionCheckoutHandler(config: Cfg) {
  return async (req: NextRequest) => {
    const body = await readBody(req);
    const meta = [...store.collections.values()].find((c) => c.adminToken === body.adminToken);
    if (!meta) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    const txn = `MOCK_${meta.id}`;
    const { fakeRedis } = await import('./mocks');
    await fakeRedis.set(`${config.brand.redisKeyPrefix}:txn-collection:${txn}`, meta.id);
    return NextResponse.json({ transactionId: txn, mock: true });
  };
}

// mark-paid: sets paid_at on the collection, 202-retry contract on a pending txn.
// Idempotent (mirrors the core handler): once a collection is paid, re-delivering
// the same (or any) txn is a no-op — paid_at + paidTxnId are written ONCE. This
// models the double-pay / double-webhook guard so tests can assert "paid exactly
// once". `alreadyPaid:true` flags the no-op path for assertions.
export function createCollectionMarkPaidHandler(_config: Cfg) {
  return async (req: NextRequest) => {
    const body = await readBody(req);
    const txn = String(body.transactionId ?? '');
    const id = txn.replace(/^MOCK_/, '');
    const meta = store.collections.get(id);
    if (!meta) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    if (body.pending === true) {
      return NextResponse.json({ status: 'pending', retryable: true }, { status: 202 });
    }
    if (meta.paidAt) {
      // Already paid — idempotent no-op. Do NOT overwrite paid_at/paidTxnId.
      return NextResponse.json({ ok: true, paid: true, alreadyPaid: true });
    }
    meta.paidAt = new Date().toISOString();
    meta.paidTxnId = txn;
    return NextResponse.json({ ok: true, paid: true });
  };
}

// finalize-paid: REQUIRES paid_at (pay-before-generate), no new charge, returns
// a canned synthesis and attempts a tribute email.
//
// Idempotent generation (mirrors the core handler's one-time-use contract): the
// FIRST successful finalize synthesizes, flips status→'generated', stores the
// content, and sends ONE tribute email. A SECOND finalize after status is
// 'generated' returns the EXISTING content (reused:true) — no second synthesis,
// no second email. This lets tests assert the "no double-generation" guard.
export function createCollectionFinalizePaidHandler(config: Cfg) {
  return async (req: NextRequest) => {
    const body = await readBody(req);
    const meta = [...store.collections.values()].find((c) => c.adminToken === body.adminToken);
    if (!meta) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    if (!meta.paidAt) {
      return NextResponse.json(
        { error: 'Payment required', code: 'PAYMENT_REQUIRED', retryable: false },
        { status: 402 },
      );
    }
    // Already generated → return the stored result, no second synthesis/email.
    if (meta.status === 'generated' && meta.generatedContent) {
      return NextResponse.json({ ok: true, tribute: meta.generatedContent, reused: true });
    }
    const tribute = 'A canned synthesized memorial tribute.';
    meta.status = 'generated';
    meta.generatedAt = new Date().toISOString();
    meta.generatedContent = tribute;
    const { sentEmails } = await import('./mocks');
    sentEmails.push({ kind: 'tribute', to: meta.organizerEmail, product: config.brand.paddleProductId });
    return NextResponse.json({ ok: true, tribute });
  };
}

// generate: standard generate handler — acks; payment re-verified inside core.
export function createCollectionGenerateHandler(config: Cfg) {
  return async () =>
    NextResponse.json({ ok: true, generated: true, product: config.brand.paddleProductId });
}

export function createDeleteCollectionHandler(_config: Cfg) {
  return async (req: NextRequest) => {
    const body = await readBody(req);
    const meta = [...store.collections.values()].find((c) => c.adminToken === body.adminToken);
    if (!meta) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
    store.collections.delete(meta.id);
    return NextResponse.json({ ok: true, deleted: meta.id });
  };
}

export function createGetCollectionHandler(config: Cfg) {
  return async () => NextResponse.json({ ok: true, product: config.brand.paddleProductId });
}
export function createEditContributionHandler(_config: Cfg) {
  return async () => NextResponse.json({ ok: true });
}
export function createGetTributeHandler(_config: Cfg) {
  return async () => NextResponse.json({ ok: true });
}
export function createFeedbackHandler(_config: Cfg) {
  return async () => NextResponse.json({ ok: true });
}

// deadline sweep: runs once per live occasion. Honors a forced status via header
// so a test can make a sub-call propagate a 401/503.
export const sweepCalls: string[] = [];
export function createCollectionDeadlineSweepHandler(config: Cfg) {
  return async (req: NextRequest) => {
    sweepCalls.push(config.brand.paddleProductId);
    const forced = req.headers.get('x-force-status');
    if (forced) return NextResponse.json({ error: 'forced' }, { status: Number(forced) });
    return NextResponse.json({ ok: true, swept: config.brand.paddleProductId });
  };
}

export function apiMockFactory() {
  return {
    createCreateCollectionHandler: vi.fn(createCreateCollectionHandler),
    createSubmitContributionHandler: vi.fn(createSubmitContributionHandler),
    createModerateContributionHandler: vi.fn(createModerateContributionHandler),
    createCollectionCheckoutHandler: vi.fn(createCollectionCheckoutHandler),
    createCollectionMarkPaidHandler: vi.fn(createCollectionMarkPaidHandler),
    createCollectionFinalizePaidHandler: vi.fn(createCollectionFinalizePaidHandler),
    createCollectionGenerateHandler: vi.fn(createCollectionGenerateHandler),
    createDeleteCollectionHandler: vi.fn(createDeleteCollectionHandler),
    createGetCollectionHandler: vi.fn(createGetCollectionHandler),
    createEditContributionHandler: vi.fn(createEditContributionHandler),
    createGetTributeHandler: vi.fn(createGetTributeHandler),
    createFeedbackHandler: vi.fn(createFeedbackHandler),
    createCollectionDeadlineSweepHandler: vi.fn(createCollectionDeadlineSweepHandler),
  };
}

export function resetApiFakes(): void {
  sweepCalls.length = 0;
  (store as unknown as { _emails?: Map<string, Set<string>> })._emails = new Map();
}
