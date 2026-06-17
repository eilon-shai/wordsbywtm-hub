import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Playwright global setup — clears this app's mock-payment / coordination keys
// from Upstash Redis before the E2E run, so stale "already used" or in-flight
// lock state from a previous run can't break a fresh run.
//
// No-op when Upstash env is absent (e.g. a sandboxed dev box) — never fail the
// whole suite just because Redis isn't reachable.
//
// Redis prefix comes from src/products/memorial/config.ts → brand.redisKeyPrefix
// ('wtm-memorial'). We only delete obviously-ephemeral mock/txn/invite keys; we
// never touch anything that could be production rate-limit or real coordination
// state for paid collections.
// ---------------------------------------------------------------------------

function loadEnvLocal(): Record<string, string> {
  // The dev server reads .env.development.local; mirror that here so the redis
  // creds resolve the same way for the cleanup step.
  for (const name of ['.env.development.local', '.env.local']) {
    try {
      const envPath = path.resolve(process.cwd(), name);
      const raw = fs.readFileSync(envPath, 'utf8');
      return raw.split('\n').reduce<Record<string, string>>((acc, line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return acc;
        const idx = trimmed.indexOf('=');
        if (idx < 1) return acc;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        acc[key] = val;
        return acc;
      }, {});
    } catch {
      /* try the next file */
    }
  }
  return {};
}

export default async function globalSetup() {
  const env = loadEnvLocal();

  const url = process.env.UPSTASH_REDIS_REST_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.log('[global-setup] Upstash env absent — skipping Redis cleanup (no-op).');
    return;
  }

  const PREFIX = 'wtm-memorial';
  const patterns = [
    `${PREFIX}:used:mock_*`,
    `${PREFIX}:txn-collection:*`,
    `${PREFIX}:invite-*`,
  ];

  for (const pattern of patterns) {
    try {
      const keysRes = await fetch(`${url}/keys/${pattern}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { result: keys } = (await keysRes.json()) as { result: string[] };
      if (keys && keys.length > 0) {
        await Promise.all(
          keys.map((key) =>
            fetch(`${url}/del/${key}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }),
          ),
        );
        console.log(
          `[global-setup] Cleared ${keys.length} key(s) matching ${pattern}: ${keys.join(', ')}`,
        );
      }
    } catch (err) {
      // Cleanup is best-effort — never block the suite on a Redis hiccup.
      console.log(`[global-setup] Redis cleanup for ${pattern} failed (non-fatal): ${String(err)}`);
    }
  }
}
