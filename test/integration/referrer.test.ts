import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Unit coverage for src/lib/referrer.ts, exercised directly (not through the
// create route — ref-attribution.test.ts already covers the route wiring).
// The venture-core db boundary is mocked with canned rows, following the same
// hoisted-handle mock pattern as partners-summary.test.ts / ref-attribution.
//
// attachReferrer: takes plain Request/Response, so we build those by hand and
// assert on which db calls it makes. getReferrerSummary: takes a db client, so
// we hand it a fake whose query() returns canned aggregate rows and assert the
// mapping / asNum coercion / totals.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({
  // Only the `update collections set referrer` calls (the attribution write).
  updateCalls: [] as Array<{ text: string; params: unknown[] }>,
  // Tokens looked up against the partners allowlist (isActivePartner gate).
  partnerSelectCalls: [] as string[],
  lookupCalls: [] as string[],
  queryThrows: false,
  dbNull: false,
  metaId: 'col-123' as string | null,
  // Whether the partners SELECT returns an ACTIVE partner (the create-time gate).
  partnerActive: true,
}));

vi.mock('@eilon-shai/venture-core/db', () => ({
  getDbClient: () =>
    h.dbNull
      ? null
      : {
          query: async (text: string, params: unknown[] = []) => {
            if (h.queryThrows) throw new Error('db down');
            const sql = text.toLowerCase();
            if (sql.includes('create table')) return []; // ensurePartnersTable DDL
            if (sql.includes('from partners')) {
              // The isActivePartner allowlist gate.
              h.partnerSelectCalls.push(params[0] as string);
              return h.partnerActive
                ? [
                    {
                      token: params[0],
                      display_name: 'Test Partner',
                      active: true,
                      created_at: '2026-01-01T00:00:00.000Z',
                    },
                  ]
                : [];
            }
            // The attribution write.
            h.updateCalls.push({ text, params });
            return [];
          },
        },
  getCollectionByAdminToken: async (_db: unknown, token: string) => {
    h.lookupCalls.push(token);
    return h.metaId ? { id: h.metaId } : null;
  },
}));

import { attachReferrer, getReferrerSummary } from '@/lib/referrer';
import { REF_HEADER } from '@/lib/ref';

beforeEach(() => {
  h.updateCalls.length = 0;
  h.partnerSelectCalls.length = 0;
  h.lookupCalls.length = 0;
  h.queryThrows = false;
  h.dbNull = false;
  h.metaId = 'col-123';
  h.partnerActive = true;
});

/** A create Request carrying (or not) an x-wtm-ref header. */
function reqWith(ref?: string): Request {
  const headers = new Headers();
  if (ref !== undefined) headers.set(REF_HEADER, ref);
  return new Request('http://localhost/api/memorial/collection/create', {
    method: 'POST',
    headers,
  });
}

/** A create Response with the given status + JSON body (default: happy create). */
function resWith(
  body: Record<string, unknown> = {
    adminUrl: 'https://wordsbywtm.com/collect/manage?t=admin_abc',
    honoreeName: 'Eleanor',
  },
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('attachReferrer', () => {
  it('skips on a non-2xx response (no lookup, no update)', async () => {
    await attachReferrer(reqWith('smith-funeral'), resWith({ error: 'bad' }, 400));
    expect(h.lookupCalls).toHaveLength(0);
    expect(h.updateCalls).toHaveLength(0);
  });

  it('skips on the { existing: true } dedup ack', async () => {
    await attachReferrer(reqWith('smith-funeral'), resWith({ existing: true }));
    expect(h.lookupCalls).toHaveLength(0);
    expect(h.updateCalls).toHaveLength(0);
  });

  it('skips when the x-wtm-ref header is missing', async () => {
    await attachReferrer(reqWith(), resWith());
    expect(h.lookupCalls).toHaveLength(0);
    expect(h.updateCalls).toHaveLength(0);
  });

  it.each(['Smith-Funeral', '-smith', 'a', 'not a slug', "x';drop table collections;--"])(
    'skips when the header slug is invalid (%j)',
    async (bad) => {
      await attachReferrer(reqWith(bad), resWith());
      expect(h.lookupCalls).toHaveLength(0);
      expect(h.updateCalls).toHaveLength(0);
    },
  );

  it('ANTI-ABUSE: a valid-shaped but non-partner slug is never attributed', async () => {
    // The slug passes REF_SLUG_RE but is not an active allowlisted partner, so
    // the create-time gate (isActivePartner) rejects it — no attribution, no
    // discount. This is THE gate the sync checkout hook relies on.
    h.partnerActive = false;
    await attachReferrer(reqWith('not-a-real-partner'), resWith());
    expect(h.partnerSelectCalls).toEqual(['not-a-real-partner']); // gate consulted
    expect(h.lookupCalls).toHaveLength(0); // never resolved the row
    expect(h.updateCalls).toHaveLength(0); // never stamped a referrer
  });

  it('resolves the row via body.adminToken when present', async () => {
    await attachReferrer(
      reqWith('smith-funeral'),
      resWith({ adminToken: 'direct_tok', honoreeName: 'Eleanor' }),
    );
    expect(h.partnerSelectCalls).toEqual(['smith-funeral']);
    expect(h.lookupCalls).toEqual(['direct_tok']);
    expect(h.updateCalls).toHaveLength(1);
    expect(h.updateCalls[0].params).toEqual(['smith-funeral', 'col-123']);
  });

  it("resolves the row via adminUrl's t= param when adminToken is absent", async () => {
    await attachReferrer(
      reqWith('smith-funeral'),
      resWith({ adminUrl: 'https://wordsbywtm.com/collect/manage?t=url_tok' }),
    );
    expect(h.lookupCalls).toEqual(['url_tok']);
    expect(h.updateCalls).toHaveLength(1);
    expect(h.updateCalls[0].params).toEqual(['smith-funeral', 'col-123']);
  });

  it('issues the first-writer-wins update only on the happy path', async () => {
    await attachReferrer(reqWith('smith-funeral'), resWith());
    expect(h.updateCalls).toHaveLength(1);
    expect(h.updateCalls[0].text).toMatch(/update collections set referrer/);
    expect(h.updateCalls[0].text).toMatch(/referrer is null/);
    expect(h.updateCalls[0].params).toEqual(['smith-funeral', 'col-123']);
  });

  it('is a no-op when the admin token cannot be extracted', async () => {
    await attachReferrer(
      reqWith('smith-funeral'),
      resWith({ shareUrl: 'https://wordsbywtm.com/c/x' }),
    );
    expect(h.lookupCalls).toHaveLength(0);
    expect(h.updateCalls).toHaveLength(0);
  });

  it('is a no-op when the row cannot be resolved from the token', async () => {
    h.metaId = null;
    await attachReferrer(reqWith('smith-funeral'), resWith());
    expect(h.lookupCalls).toEqual(['admin_abc']);
    expect(h.updateCalls).toHaveLength(0);
  });

  it('is a no-op when the DB client is unavailable', async () => {
    h.dbNull = true;
    await attachReferrer(reqWith('smith-funeral'), resWith());
    expect(h.updateCalls).toHaveLength(0);
  });

  it('swallows a DB error and never throws (fail-closed telemetry)', async () => {
    // A DB error at the allowlist gate fails CLOSED: getPartner swallows it and
    // returns null, so we simply don't attribute (no lookup, no update) — and
    // attachReferrer still resolves without throwing into the create path.
    h.queryThrows = true;
    await expect(
      attachReferrer(reqWith('smith-funeral'), resWith()),
    ).resolves.toBeUndefined();
    expect(h.lookupCalls).toHaveLength(0);
    expect(h.updateCalls).toHaveLength(0);
  });
});

// A minimal db-client stand-in whose query() returns canned rows, matching the
// getReferrerSummary(db) signature (it takes the client, doesn't fetch it).
function fakeDb(rows: Array<Record<string, unknown>>) {
  return { query: async () => rows } as unknown as Parameters<typeof getReferrerSummary>[0];
}

describe('getReferrerSummary', () => {
  it('maps rows, coerces string counts to numbers, and computes totals', async () => {
    const db = fakeDb([
      {
        referrer: 'smith-funeral',
        collections: '5',
        generated: '2',
        paid: '3',
        first_created_at: '2026-06-01T00:00:00.000Z',
        last_created_at: '2026-07-01T00:00:00.000Z',
      },
      {
        referrer: 'valley-hospice',
        collections: '1',
        generated: '0',
        paid: '0',
        first_created_at: '2026-06-15T00:00:00.000Z',
        last_created_at: '2026-06-15T00:00:00.000Z',
      },
    ]);
    const out = await getReferrerSummary(db);
    expect(out.totals).toEqual({ referrers: 2, collections: 6, generated: 2, paid: 3 });
    expect(out.referrers[0]).toEqual({
      referrer: 'smith-funeral',
      collections: 5,
      generated: 2,
      paid: 3,
      firstCreatedAt: '2026-06-01T00:00:00.000Z',
      lastCreatedAt: '2026-07-01T00:00:00.000Z',
    });
    // asNum coerced the string counts into real numbers.
    expect(typeof out.referrers[0].collections).toBe('number');
  });

  it('coerces null counts to 0 via asNum', async () => {
    const db = fakeDb([
      {
        referrer: 'sparse-partner',
        collections: 4,
        generated: null,
        paid: null,
        first_created_at: '2026-06-01T00:00:00.000Z',
        last_created_at: '2026-06-02T00:00:00.000Z',
      },
    ]);
    const out = await getReferrerSummary(db);
    expect(out.referrers[0].generated).toBe(0);
    expect(out.referrers[0].paid).toBe(0);
    expect(out.totals).toEqual({ referrers: 1, collections: 4, generated: 0, paid: 0 });
  });

  it('returns empty referrers + zero totals for an empty result set', async () => {
    const out = await getReferrerSummary(fakeDb([]));
    expect(out.referrers).toEqual([]);
    expect(out.totals).toEqual({ referrers: 0, collections: 0, generated: 0, paid: 0 });
  });

  it('passes through null date fields without throwing', async () => {
    const db = fakeDb([
      {
        referrer: 'no-dates',
        collections: '2',
        generated: '1',
        paid: '0',
        first_created_at: null,
        last_created_at: null,
      },
    ]);
    const out = await getReferrerSummary(db);
    expect(out.referrers[0].firstCreatedAt).toBeNull();
    expect(out.referrers[0].lastCreatedAt).toBeNull();
    expect(out.referrers[0].collections).toBe(2);
  });
});
