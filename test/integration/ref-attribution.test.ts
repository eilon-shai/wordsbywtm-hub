import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeRequest } from '@eilon-shai/venture-core/test-utils';

// ---------------------------------------------------------------------------
// Partner referral attribution on the create route (?ref → x-wtm-ref header →
// collections.referrer). Custom module-boundary mocks (not the shared helpers):
// the api fake returns the REAL production create response shape — { shareUrl,
// adminUrl, priceShown, honoreeName }, no row id — so these tests exercise the
// adminUrl → adminToken → getCollectionByAdminToken → update resolution chain.
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => ({
  queryCalls: [] as Array<{ text: string; params: unknown[] }>,
  lookupCalls: [] as string[],
  queryThrows: false,
  lookupThrows: false,
  dbNull: false,
  metaId: 'col-123' as string | null,
  mode: 'created' as 'created' | 'existing' | 'invalid',
  // Whether the partners allowlist gate (isActivePartner) sees an active partner.
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
            if (sql.includes('create table') || sql.includes('alter table')) return []; // ensurePartnersTable DDL
            if (sql.includes('from partners')) {
              // Create-time allowlist gate — return an active partner row (or none).
              // Empty occasions scope = all occasions, so it permits the memorial
              // create in these tests.
              return h.partnerActive
                ? [{ token: params[0], display_name: 'Test Partner', active: true, occasions: [], created_at: '2026-01-01T00:00:00.000Z' }]
                : [];
            }
            h.queryCalls.push({ text, params }); // the attribution write only
            return [];
          },
        },
  getCollectionByAdminToken: async (_db: unknown, token: string) => {
    if (h.lookupThrows) throw new Error('lookup boom');
    h.lookupCalls.push(token);
    return h.metaId ? { id: h.metaId } : null;
  },
}));

vi.mock('@eilon-shai/venture-core/api', () => ({
  createCreateCollectionHandler: () => async () => {
    const { NextResponse } = await import('next/server');
    if (h.mode === 'existing') return NextResponse.json({ existing: true });
    if (h.mode === 'invalid') {
      return NextResponse.json(
        { error: 'Invalid email address', code: 'INVALID_SESSION', retryable: false },
        { status: 400 },
      );
    }
    return NextResponse.json({
      shareUrl: 'https://wordsbywtm.com/c/share_abc',
      adminUrl: 'https://wordsbywtm.com/collect/manage?t=admin_abc',
      priceShown: 49,
      honoreeName: 'Eleanor',
    });
  },
}));

vi.mock('@eilon-shai/venture-core/redis', () => ({ getRedisClient: () => null }));

import { POST as create } from '@/app/api/[occasion]/collection/create/route';

const params = { params: Promise.resolve({ occasion: 'memorial' }) };
const BODY = { organizerEmail: 'org@example.com', honoreeName: 'Eleanor' };

function post(refHeader?: string) {
  return create(
    makeRequest(BODY, { headers: refHeader === undefined ? {} : { 'x-wtm-ref': refHeader } }),
    params,
  );
}

beforeEach(() => {
  h.queryCalls.length = 0;
  h.lookupCalls.length = 0;
  h.queryThrows = false;
  h.lookupThrows = false;
  h.dbNull = false;
  h.metaId = 'col-123';
  h.mode = 'created';
  h.partnerActive = true;
});

describe('create route — referral attribution', () => {
  it('stamps the referrer on a successful create with a valid x-wtm-ref header', async () => {
    const res = await post('smith-funeral');
    expect(res.status).toBe(200);
    // Row resolved via the adminUrl's t= token, then updated first-writer-wins.
    expect(h.lookupCalls).toEqual(['admin_abc']);
    expect(h.queryCalls).toHaveLength(1);
    expect(h.queryCalls[0].text).toMatch(/update collections set referrer/);
    expect(h.queryCalls[0].text).toMatch(/referrer is null/);
    expect(h.queryCalls[0].params).toEqual(['smith-funeral', 'col-123']);
    // The client-visible body is untouched by the attribution read (clone).
    expect(await res.json()).toMatchObject({ honoreeName: 'Eleanor' });
  });

  it('does nothing without the header', async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(h.queryCalls).toHaveLength(0);
    expect(h.lookupCalls).toHaveLength(0);
  });

  it.each(['Smith-Funeral', '-smith', 'a', 'not a slug', "x';drop table collections;--"])(
    'ignores an invalid header slug (%j) — re-validated server-side',
    async (bad) => {
      const res = await post(bad);
      expect(res.status).toBe(200);
      expect(h.queryCalls).toHaveLength(0);
      expect(h.lookupCalls).toHaveLength(0);
    },
  );

  it('skips attribution when the handler rejects the create (non-2xx)', async () => {
    h.mode = 'invalid';
    const res = await post('smith-funeral');
    expect(res.status).toBe(400);
    expect(h.queryCalls).toHaveLength(0);
  });

  it('skips attribution on the existing-collection dedup ack', async () => {
    h.mode = 'existing';
    const res = await post('smith-funeral');
    expect(res.status).toBe(200);
    expect(h.queryCalls).toHaveLength(0);
  });

  it('swallows an update failure — the create still succeeds (fail-silent telemetry)', async () => {
    h.queryThrows = true;
    const res = await post('smith-funeral');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ honoreeName: 'Eleanor' });
  });

  it('swallows a lookup failure — the create still succeeds', async () => {
    h.lookupThrows = true;
    const res = await post('smith-funeral');
    expect(res.status).toBe(200);
  });

  it('is a no-op when the collection cannot be resolved from the admin token', async () => {
    h.metaId = null;
    const res = await post('smith-funeral');
    expect(res.status).toBe(200);
    expect(h.queryCalls).toHaveLength(0);
  });

  it('is a no-op when the DB client is unavailable', async () => {
    h.dbNull = true;
    const res = await post('smith-funeral');
    expect(res.status).toBe(200);
    expect(h.queryCalls).toHaveLength(0);
  });
});
