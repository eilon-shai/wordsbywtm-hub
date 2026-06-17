// ---------------------------------------------------------------------------
// Custom stateful Redis fake. test-utils' createMockRedis lacks incr/decr/expire,
// which the invite + resend-link + cron + txn-resolve flows need. This Map-backed
// fake implements the subset the app touches: get/set/incr/decr/expire/del.
// Numeric values are stored as numbers so incr/decr behave like Upstash.
// ---------------------------------------------------------------------------

export interface FakeRedis {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<'OK'>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
  _store: Map<string, unknown>;
}

export function createFakeRedis(): FakeRedis {
  const _store = new Map<string, unknown>();
  return {
    _store,
    async get<T = unknown>(key: string): Promise<T | null> {
      return (_store.has(key) ? (_store.get(key) as T) : null) as T | null;
    },
    async set(key: string, value: unknown): Promise<'OK'> {
      _store.set(key, value);
      return 'OK';
    },
    async incr(key: string): Promise<number> {
      const next = (Number(_store.get(key)) || 0) + 1;
      _store.set(key, next);
      return next;
    },
    async decr(key: string): Promise<number> {
      const next = (Number(_store.get(key)) || 0) - 1;
      _store.set(key, next);
      return next;
    },
    async expire(): Promise<number> {
      return 1; // TTL is a no-op in tests
    },
    async del(key: string): Promise<number> {
      return _store.delete(key) ? 1 : 0;
    },
  };
}
