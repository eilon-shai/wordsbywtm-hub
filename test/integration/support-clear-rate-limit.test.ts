import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const del = vi.fn(async (...keys: string[]) => keys.length);

vi.mock('@eilon-shai/venture-core/redis', () => ({
  getRedisClient: vi.fn(() => ({ del })),
}));

import * as redisMod from '@eilon-shai/venture-core/redis';
import { POST } from '@/app/api/support/clear-rate-limit/route';

function req(ip?: string) {
  return new NextRequest('http://localhost/api/support/clear-rate-limit', {
    method: 'POST',
    headers: ip ? { 'x-real-ip': ip } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(redisMod.getRedisClient).mockReturnValue({ del } as never);
});

describe('support/clear-rate-limit route', () => {
  it('deletes the IP-keyed limiter keys for the caller IP and reports the count', async () => {
    const res = await POST(req('1.2.3.4'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ip).toBe('1.2.3.4');
    expect(json.cleared).toBeGreaterThan(0);

    const keys = del.mock.calls[0] as string[];
    // every key is scoped to this exact IP — never another machine's
    expect(keys.every((k) => k.endsWith(':1.2.3.4'))).toBe(true);
    // the app-global limiters are covered
    expect(keys).toContain('wtm:check-existing:1.2.3.4');
    expect(keys).toContain('wtm:audio:1h:ip:1.2.3.4');
    // and at least one per-occasion create bucket
    expect(keys.some((k) => /:create-ip:1[hd]:1\.2\.3\.4$/.test(k))).toBe(true);
  });

  it('never touches email-keyed buckets (machine-scoped only)', async () => {
    await POST(req('9.9.9.9'));
    const keys = del.mock.calls[0] as string[];
    expect(keys.some((k) => k.includes('create-email'))).toBe(false);
  });

  it('400 when the IP cannot be determined', async () => {
    const res = await POST(req()); // no x-real-ip / x-forwarded-for → "anonymous"
    expect(res.status).toBe(400);
    expect(del).not.toHaveBeenCalled();
  });

  it('503 when Redis is unavailable', async () => {
    vi.mocked(redisMod.getRedisClient).mockReturnValue(null as never);
    expect((await POST(req('1.2.3.4'))).status).toBe(503);
  });
});
