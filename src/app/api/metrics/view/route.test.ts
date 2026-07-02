import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Beacon route validation. bumpFunnel is mocked so we assert exactly when a
// counter would (and would not) be bumped. The route's contract: ALWAYS 204
// (never an oracle for valid occasions/steps), no cookies, and 'create' is
// rejected — only the create API route may count creates.
// ---------------------------------------------------------------------------

const bumpFunnel = vi.fn(async () => {});
vi.mock('@/lib/funnel', () => ({
  bumpFunnel: (...args: unknown[]) => bumpFunnel(...(args as [])),
}));

import { POST as view } from './route';

const HUMAN_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function beaconReq(body: unknown, ua: string | null = HUMAN_UA) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (ua !== null) headers['user-agent'] = ua;
  return new NextRequest('http://localhost/api/metrics/view', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => bumpFunnel.mockClear());

describe('metrics/view beacon', () => {
  it('204 + bump for a valid live occasion and step', async () => {
    const res = await view(beaconReq({ occasion: 'memorial', step: 'landing' }));
    expect(res.status).toBe(204);
    expect(bumpFunnel).toHaveBeenCalledWith('memorial', 'landing');
  });

  it('accepts step=start', async () => {
    const res = await view(beaconReq({ occasion: 'wedding', step: 'start' }));
    expect(res.status).toBe(204);
    expect(bumpFunnel).toHaveBeenCalledWith('wedding', 'start');
  });

  it("204 but NO bump for step=create (server-side only — client can't inflate it)", async () => {
    const res = await view(beaconReq({ occasion: 'memorial', step: 'create' }));
    expect(res.status).toBe(204);
    expect(bumpFunnel).not.toHaveBeenCalled();
  });

  it('204 but no bump for an unknown occasion', async () => {
    const res = await view(beaconReq({ occasion: 'graduation', step: 'landing' }));
    expect(res.status).toBe(204);
    expect(bumpFunnel).not.toHaveBeenCalled();
  });

  it('204 but no bump for an unknown step', async () => {
    const res = await view(beaconReq({ occasion: 'memorial', step: 'purchase' }));
    expect(res.status).toBe(204);
    expect(bumpFunnel).not.toHaveBeenCalled();
  });

  it('204 but no bump for a malformed body', async () => {
    const res = await view(beaconReq('not json{'));
    expect(res.status).toBe(204);
    expect(bumpFunnel).not.toHaveBeenCalled();
  });

  it('204 but no bump for non-string occasion/step', async () => {
    const res = await view(beaconReq({ occasion: 42, step: ['landing'] }));
    expect(res.status).toBe(204);
    expect(bumpFunnel).not.toHaveBeenCalled();
  });

  it.each(['Googlebot/2.1', 'my-crawler/1.0', 'FB-preview agent', 'HeadlessChrome/126.0', 'A spider thing'])(
    'drops the obvious bot UA %s',
    async (ua) => {
      const res = await view(beaconReq({ occasion: 'memorial', step: 'landing' }, ua));
      expect(res.status).toBe(204);
      expect(bumpFunnel).not.toHaveBeenCalled();
    },
  );

  it('drops requests with no user-agent at all', async () => {
    const res = await view(beaconReq({ occasion: 'memorial', step: 'landing' }, null));
    expect(res.status).toBe(204);
    expect(bumpFunnel).not.toHaveBeenCalled();
  });

  it('sets no cookies on the response', async () => {
    const res = await view(beaconReq({ occasion: 'memorial', step: 'landing' }));
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
