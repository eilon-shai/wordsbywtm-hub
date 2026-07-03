import { describe, it, expect, beforeEach } from 'vitest';
import {
  addPartner,
  getPartner,
  isActivePartner,
  listPartners,
  setPartnerActive,
  generatePartnerToken,
  __resetPartnersTableGuard,
} from './partners-store';

// ---------------------------------------------------------------------------
// Store tests against an in-memory fake SqlClient (every store fn takes an
// explicit `db`), so no real Postgres is needed. The fake understands only the
// exact query shapes partners-store issues.
// ---------------------------------------------------------------------------

interface Row {
  token: string;
  display_name: string;
  active: boolean;
  created_at: string;
}

function makeFakeDb(initial: Row[] = []) {
  const table = [...initial];
  let seq = 0;
  return {
    _table: table,
    query: async <T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> => {
      const sql = text.replace(/\s+/g, ' ').trim().toLowerCase();

      if (sql.startsWith('create table')) return [] as T[];

      if (sql.startsWith('select') && sql.includes('and active = true')) {
        const token = params[0];
        return table.filter((r) => r.token === token && r.active) as unknown as T[];
      }

      if (sql.startsWith('select') && sql.includes('order by active desc')) {
        const sorted = [...table].sort(
          (a, b) =>
            Number(b.active) - Number(a.active) || b.created_at.localeCompare(a.created_at),
        );
        return sorted as unknown as T[];
      }

      if (sql.startsWith('insert into partners')) {
        const [token, name] = params as [string, string];
        if (table.some((r) => r.token === token)) return [] as T[]; // on conflict do nothing
        const row: Row = {
          token,
          display_name: name,
          active: true,
          // Monotonic timestamps so the "newest first" sort is deterministic.
          created_at: new Date(1_700_000_000_000 + seq++ * 1000).toISOString(),
        };
        table.push(row);
        return [row] as unknown as T[];
      }

      if (sql.startsWith('update partners set active')) {
        const [token, active] = params as [string, boolean];
        const row = table.find((r) => r.token === token);
        if (!row) return [] as T[];
        row.active = active;
        return [row] as unknown as T[];
      }

      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

beforeEach(() => {
  __resetPartnersTableGuard();
});

describe('generatePartnerToken', () => {
  it('mints an opaque `p-`-prefixed lowercase-hex token that is a valid ref slug', () => {
    for (let i = 0; i < 20; i++) {
      const t = generatePartnerToken();
      expect(t).toMatch(/^p-[0-9a-f]{8}$/);
    }
  });
});

describe('addPartner', () => {
  it('adds an active partner with a minted token and trimmed name', async () => {
    const db = makeFakeDb();
    const p = await addPartner('  Riverside Memorial Home  ', db);
    expect(p.displayName).toBe('Riverside Memorial Home');
    expect(p.active).toBe(true);
    expect(p.token).toMatch(/^p-[0-9a-f]{8}$/);
    expect(p.createdAt).toBeTruthy();
  });

  it('rejects an empty / whitespace-only name', async () => {
    const db = makeFakeDb();
    await expect(addPartner('   ', db)).rejects.toThrow(/required/i);
  });

  it('rejects a name over 120 chars', async () => {
    const db = makeFakeDb();
    await expect(addPartner('x'.repeat(121), db)).rejects.toThrow(/120/);
  });
});

describe('getPartner / isActivePartner', () => {
  it('returns an active partner and true for isActivePartner', async () => {
    const db = makeFakeDb();
    const added = await addPartner('Smith Funeral Home', db);
    expect(await getPartner(added.token, db)).toMatchObject({
      token: added.token,
      displayName: 'Smith Funeral Home',
      active: true,
    });
    expect(await isActivePartner(added.token, db)).toBe(true);
  });

  it('returns null for an unknown or malformed token', async () => {
    const db = makeFakeDb();
    expect(await getPartner('p-notreal', db)).toBeNull();
    expect(await getPartner('BAD_TOKEN', db)).toBeNull();
    expect(await getPartner(null, db)).toBeNull();
    expect(await isActivePartner('p-notreal', db)).toBe(false);
  });

  it('does NOT return a deactivated partner (fail-closed for the discount gate)', async () => {
    const db = makeFakeDb();
    const added = await addPartner('Valley Hospice', db);
    await setPartnerActive(added.token, false, db);
    expect(await getPartner(added.token, db)).toBeNull();
    expect(await isActivePartner(added.token, db)).toBe(false);
  });
});

describe('setPartnerActive', () => {
  it('deactivates then reactivates a partner', async () => {
    const db = makeFakeDb();
    const added = await addPartner('Meadow Funeral Care', db);
    const off = await setPartnerActive(added.token, false, db);
    expect(off?.active).toBe(false);
    const on = await setPartnerActive(added.token, true, db);
    expect(on?.active).toBe(true);
    expect(await isActivePartner(added.token, db)).toBe(true);
  });

  it('returns null for an unknown token', async () => {
    const db = makeFakeDb();
    expect(await setPartnerActive('p-unknown1', false, db)).toBeNull();
  });

  it('throws for a malformed token', async () => {
    const db = makeFakeDb();
    await expect(setPartnerActive('BAD', true, db)).rejects.toThrow(/invalid/i);
  });
});

describe('listPartners', () => {
  it('lists all partners, active first then newest first', async () => {
    const db = makeFakeDb();
    const a = await addPartner('Alpha Home', db);
    const b = await addPartner('Beta Home', db);
    await addPartner('Gamma Home', db);
    await setPartnerActive(a.token, false, db); // deactivate the oldest

    const list = await listPartners(db);
    expect(list).toHaveLength(3);
    // Active ones come first; among active, newest (Gamma) before Beta.
    expect(list[0].displayName).toBe('Gamma Home');
    expect(list[1].displayName).toBe('Beta Home');
    // The deactivated one sinks to the bottom.
    expect(list[2].token).toBe(a.token);
    expect(list[2].active).toBe(false);
    expect(b.active).toBe(true);
  });
});
