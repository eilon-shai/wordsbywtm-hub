// ---------------------------------------------------------------------------
// Partner registry — the Postgres store of record + opaque-token minting.
//
// SERVER-ONLY. It imports getDbClient (pulls the pg driver) and node:crypto, so
// it must never reach a client bundle — import it only from server components,
// API route handlers, and other server modules (referrer.ts). The client-safe
// pure helpers (resolvePrice, resolvePartnerDiscount, …) live in ./partners.
//
// The `partners` table is the single source of truth for who is an active
// partner — managed live from /support/partners, no code deploy. It is
// auto-created on demand here (ensurePartnersTable), mirroring the
// collection_audio/collection_feedback precedent, so the feature works even on a
// DB that never had db/schema.sql applied.
//
// Discount safety: getPartner returns ACTIVE partners only, and it is the
// allowlist gate used at CREATE time by attachReferrer. See the SECURITY
// INVARIANT in ./partners for why the sync checkout hook can then trust any
// stored referrer.
// ---------------------------------------------------------------------------

import { randomBytes } from 'node:crypto';
import { getDbClient, type SqlClient } from '@eilon-shai/venture-core/db';
import { isPartnerToken, type Partner } from '@/lib/partners';

/** Max length for a family-facing display name (a business name, not an essay). */
const MAX_DISPLAY_NAME = 120;

interface PartnerRow {
  token: string;
  display_name: string;
  active: boolean;
  created_at: string | Date;
}

function rowToPartner(r: PartnerRow): Partner {
  const createdAt =
    r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at);
  return { token: r.token, displayName: r.display_name, active: r.active, createdAt };
}

// Per-instance guard so we don't issue the `create table` DDL on every call.
// A DDL failure leaves this false, so the next call retries. `if not exists`
// keeps it idempotent regardless.
let tableEnsured = false;

async function ensurePartnersTable(db: SqlClient): Promise<void> {
  if (tableEnsured) return;
  await db.query(
    `create table if not exists partners (
       token        text        primary key,
       display_name text        not null,
       active       boolean     not null default true,
       created_at   timestamptz not null default now()
     )`,
  );
  tableEnsured = true;
}

/** Test seam — reset the in-process DDL guard so a fresh DB re-runs ensure. */
export function __resetPartnersTableGuard(): void {
  tableEnsured = false;
}

const SELECT_COLS = 'token, display_name, active, created_at';

/**
 * Resolve an opaque `?ref` token to its ACTIVE partner entry, or null. Validates
 * the token shape first, then reads Postgres. This is the allowlist gate:
 *   - the landing banner uses it to decide whether to endorse a partner, and
 *   - attachReferrer uses it (via isActivePartner) to decide whether to stamp
 *     the referrer at create — the sole write that later earns a discount.
 * Fail-closed: an invalid token, a missing DB, or a query error all return null
 * (no endorsement, no discount) rather than throwing into a render/create path.
 */
export async function getPartner(
  token: string | null | undefined,
  db?: SqlClient | null,
): Promise<Partner | null> {
  if (!isPartnerToken(token)) return null;
  const client = db ?? getDbClient();
  if (!client) return null;
  try {
    await ensurePartnersTable(client);
    const rows = await client.query<PartnerRow>(
      `select ${SELECT_COLS} from partners where token = $1 and active = true`,
      [token],
    );
    return rows[0] ? rowToPartner(rows[0]) : null;
  } catch (err) {
    console.error('[partners] getPartner error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Whether a token maps to a known, ACTIVE partner. Fail-closed (see getPartner). */
export async function isActivePartner(
  token: string | null | undefined,
  db?: SqlClient | null,
): Promise<boolean> {
  return (await getPartner(token, db)) !== null;
}

/**
 * All partners (active first, newest first) for the admin console — INCLUDES
 * deactivated ones so they can be reactivated. Throws on DB error so the admin
 * page can surface it (unlike the fail-closed read paths above).
 */
export async function listPartners(db?: SqlClient | null): Promise<Partner[]> {
  const client = db ?? getDbClient();
  if (!client) throw new Error('Database unavailable (DATABASE_URL not set).');
  await ensurePartnersTable(client);
  const rows = await client.query<PartnerRow>(
    `select ${SELECT_COLS} from partners order by active desc, created_at desc`,
  );
  return rows.map(rowToPartner);
}

/** Mint a fresh opaque partner token, e.g. `p-1a2b3c4d`. 4 random bytes keeps
 *  the collision odds negligible for a hand-managed partner list. */
export function generatePartnerToken(): string {
  return `p-${randomBytes(4).toString('hex')}`;
}

/**
 * Add a new partner with a freshly minted opaque token. Validates + trims the
 * display name and retries on the astronomically unlikely token clash. Returns
 * the created Partner (active). Throws on bad input / no DB / exhausted retries.
 */
export async function addPartner(displayName: string, db?: SqlClient | null): Promise<Partner> {
  const name = (displayName ?? '').trim();
  if (!name) throw new Error('A partner display name is required.');
  if (name.length > MAX_DISPLAY_NAME) {
    throw new Error(`Display name must be ${MAX_DISPLAY_NAME} characters or fewer.`);
  }
  const client = db ?? getDbClient();
  if (!client) throw new Error('Database unavailable (DATABASE_URL not set).');
  await ensurePartnersTable(client);
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generatePartnerToken();
    const rows = await client.query<PartnerRow>(
      `insert into partners (token, display_name) values ($1, $2)
         on conflict (token) do nothing
         returning ${SELECT_COLS}`,
      [token, name],
    );
    if (rows[0]) return rowToPartner(rows[0]);
  }
  throw new Error('Could not allocate a unique partner token — please try again.');
}

/**
 * Activate or deactivate a partner by token. Deactivating stops new
 * endorsements/discounts immediately (organic from then on) but keeps the row
 * for attribution history. Returns the updated Partner, or null if the token
 * isn't known. Throws on bad input / no DB.
 */
export async function setPartnerActive(
  token: string,
  active: boolean,
  db?: SqlClient | null,
): Promise<Partner | null> {
  if (!isPartnerToken(token)) throw new Error('Invalid partner token.');
  const client = db ?? getDbClient();
  if (!client) throw new Error('Database unavailable (DATABASE_URL not set).');
  await ensurePartnersTable(client);
  const rows = await client.query<PartnerRow>(
    `update partners set active = $2 where token = $1 returning ${SELECT_COLS}`,
    [token, active],
  );
  return rows[0] ? rowToPartner(rows[0]) : null;
}
