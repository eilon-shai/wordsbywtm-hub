import { NextRequest, NextResponse } from 'next/server';
import { createCreateCollectionHandler } from '@eilon-shai/venture-core/api';
import { getConfig, getOccasionMeta } from '@/lib/registry';
import { checkRateLimits, hashForKey, clientIp, type RateRule } from '@/lib/rate-limit';
import { bumpFunnel } from '@/lib/funnel';
import { attachReferrer } from '@/lib/referrer';

export const maxDuration = 60;

const HOUR = 3600;
const DAY = 86400;
// Anti-abuse caps for collection creation. Each create attempt emails the
// manage link to the organizer's address (new) or re-sends it (dedup) — so an
// unbounded create endpoint is both a DB-bloat and an email-bomb vector. These
// bound it per-EMAIL (the dimension venture-core's per-IP limit misses) and add
// a per-IP backstop. Generous enough that no real organizer is ever caught.
const CREATE_LIMITS = {
  emailHour: 3,
  emailDay: 6,
  ipHour: 10,
  ipDay: 30,
} as const;

// POST /api/[occasion]/collection/create — handler 1.
// Occasion lives in the route, so config selection is trivial.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ occasion: string }> },
): Promise<NextResponse> {
  const { occasion } = await params;
  const config = getConfig(occasion);
  const meta = getOccasionMeta(occasion);
  // Reject unknown occasions, occasions without a collection flow, AND occasions
  // that are built but not yet launched (live:false). An occasion can have a
  // full collectionConfig before its Paddle IDs exist; until it's live we must
  // not accept collections for it, even via a direct API call.
  if (!config || !config.collectionConfig || !meta?.live) {
    return NextResponse.json(
      { error: 'Unknown occasion', code: 'NOT_FOUND', retryable: false },
      { status: 404 },
    );
  }
  // SEC-05: the stored occasion is derived from the validated route, never the
  // client body. Rebuild the request with occasion forced to the route value.
  let forwarded = request;
  let organizerEmail = '';
  try {
    const body = (await request.clone().json()) as Record<string, unknown>;
    body.occasion = occasion;
    organizerEmail = typeof body.organizerEmail === 'string' ? body.organizerEmail : '';
    forwarded = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    });
  } catch {
    // Unparseable body — let the handler return its own validation error.
  }

  // ANTI-ABUSE: bound creation per-email and per-IP before delegating. The
  // per-email caps are the key control — they stop a scripted actor from
  // creating thousands of collections (and email-bombing a forged address with
  // the manage-link email) even while rotating IPs. The per-IP rules run on EVERY
  // attempt (incl. empty/garbage bodies that the core handler 400s) so a bot
  // can't spam that path uncapped; the per-email rules add on when an email is
  // present. Mock/E2E bypasses so happy-path tests aren't throttled. Fail-open.
  if (process.env.ENABLE_MOCK_PAYMENT !== 'true') {
    const prefix = config.brand.redisKeyPrefix;
    const ip = clientIp(request.headers);
    const rules: Array<{ key: string } & RateRule> = [
      { key: `${prefix}:create-ip:1h:${ip}`, limit: CREATE_LIMITS.ipHour, windowSec: HOUR },
      { key: `${prefix}:create-ip:1d:${ip}`, limit: CREATE_LIMITS.ipDay, windowSec: DAY },
    ];
    const email = organizerEmail.trim();
    if (email) {
      const emailKey = hashForKey(email);
      rules.push(
        { key: `${prefix}:create-email:1h:${emailKey}`, limit: CREATE_LIMITS.emailHour, windowSec: HOUR },
        { key: `${prefix}:create-email:1d:${emailKey}`, limit: CREATE_LIMITS.emailDay, windowSec: DAY },
      );
    }
    const { ok } = await checkRateLimits(rules);
    if (!ok) {
      return NextResponse.json(
        {
          error: 'You’ve started a few collections in a short time. Please wait a little while before creating another, or check your email for the link to one you already started.',
          code: 'RATE_LIMIT',
          retryable: true,
        },
        { status: 429 },
      );
    }
  }

  const response = await createCreateCollectionHandler(config)(forwarded);
  // Funnel counter: count successful creates server-side (aggregate daily
  // counter only — no user data). Status check only, body untouched; bumpFunnel
  // is fail-silent so this can never break a create.
  if (response.ok) await bumpFunnel(occasion, 'create');
  // Partner referral attribution (?ref → x-wtm-ref header → collections.referrer).
  // Fail-silent telemetry; a no-op unless a valid slug header rode the request.
  await attachReferrer(request, response);
  return response;
}
