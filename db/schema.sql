-- Collaborative collection store (DEC-P-009 — scoped Postgres exception to DEC-P-005).
-- Apply with: psql "$DATABASE_URL" -f schema.sql   (or the db:migrate script).
-- Idempotent: safe to re-run.

create table if not exists collections (
  id            uuid        primary key,
  product       text        not null,
  organizer_email text      not null,
  honoree_name  text        not null,
  occasion      text        not null,
  tier          text        not null,
  status        text        not null default 'open',   -- open | closed | generated
  share_token   text        not null unique,
  admin_token   text        not null unique,
  price_shown   numeric      not null,
  created_at    timestamptz not null default now(),
  deadline      timestamptz,
  purge_after   timestamptz,
  synthesis_prefs jsonb                                   -- organizer-set tone/length/avoid/context
);

-- Additive migration for tables created before synthesis_prefs existed.
alter table collections add column if not exists synthesis_prefs jsonb;

create index if not exists collections_share_token_idx on collections (share_token);
create index if not exists collections_admin_token_idx on collections (admin_token);
-- Purge sweep target: abandoned/never-finalized collections past their TTL.
create index if not exists collections_purge_idx on collections (purge_after)
  where status <> 'generated';

create table if not exists contributions (
  id              uuid        primary key,
  -- on delete cascade => deleting a collection erases all its contributions (GDPR).
  collection_id   uuid        not null references collections (id) on delete cascade,
  idempotency_key text        not null,
  -- AES-256-GCM payload: { contributorName, relationship, memory }, AAD = contribution id.
  encrypted_payload text      not null,
  status          text        not null default 'pending',  -- pending | approved | removed
  created_at      timestamptz not null default now(),
  -- Atomic dedup: a retried/double-clicked submit hits this constraint, not a new row.
  unique (collection_id, idempotency_key)
);

create index if not exists contributions_collection_idx on contributions (collection_id);
