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
  synthesis_prefs jsonb,                                  -- organizer-set tone/length/avoid/context
  organizer_name text,                                    -- organizer display name (shown to invited contributors)
  paid_at       timestamptz,                              -- set when payment is recorded (pay-before-generate gate)
  paid_txn_id   text,                                     -- Paddle transaction id that paid for this collection
  generated_at  timestamptz,                              -- set when synthesis is saved
  generated_content text,                                 -- durable synthesized deliverable
  reminder_sent_at timestamptz,                           -- deadline-reminder email sent marker
  deadline_extended_count int not null default 0          -- # of times the deadline was extended
);

-- Additive migrations for tables created before these columns existed. Idempotent.
alter table collections add column if not exists synthesis_prefs jsonb;
alter table collections add column if not exists organizer_name text;
alter table collections add column if not exists paid_at timestamptz;
alter table collections add column if not exists paid_txn_id text;
alter table collections add column if not exists generated_at timestamptz;
alter table collections add column if not exists generated_content text;
alter table collections add column if not exists reminder_sent_at timestamptz;
alter table collections add column if not exists deadline_extended_count int not null default 0;

create index if not exists collections_share_token_idx on collections (share_token);
create index if not exists collections_admin_token_idx on collections (admin_token);
-- Purge sweep target: abandoned/never-finalized collections past their TTL.
create index if not exists collections_purge_idx on collections (purge_after)
  where status <> 'generated';
-- Deadline sweep target: open collections at/after their deadline.
create index if not exists collections_deadline_idx on collections (deadline)
  where status = 'open' and deadline is not null;

create table if not exists contributions (
  id              uuid        primary key,
  -- on delete cascade => deleting a collection erases all its contributions (GDPR).
  collection_id   uuid        not null references collections (id) on delete cascade,
  idempotency_key text        not null,
  -- AES-256-GCM payload: { contributorName, relationship, memory }, AAD = contribution id.
  encrypted_payload text      not null,
  status          text        not null default 'pending',  -- pending | approved | removed
  created_at      timestamptz not null default now(),
  contributor_email_hash text,                             -- keyed (HMAC) hash of the contributor email: dedup + erasure lookup
  is_organizer    boolean     not null default false,      -- the organizer's own (pinned, cap-exempt) memory
  -- Atomic dedup: a retried/double-clicked submit hits this constraint, not a new row.
  unique (collection_id, idempotency_key)
);

-- Additive migrations for tables created before these columns existed. Idempotent.
alter table contributions add column if not exists contributor_email_hash text;
alter table contributions add column if not exists is_organizer boolean not null default false;

create index if not exists contributions_collection_idx on contributions (collection_id);

-- Race-safe abuse backstops (the documented one-memory-per-email / one-organizer
-- guarantees). Partial unique indexes so two concurrent same-email (or
-- organizer-flagged) inserts can't both land. Predicates match prod pg_indexes
-- exactly (verified 2026-06-21): the email slot is keyed on (collection_id,
-- contributor_email_hash) regardless of status — i.e. a removed memory does NOT
-- free the email to resubmit; one organizer row per collection regardless of status.
create unique index if not exists contributions_email_uniq
  on contributions (collection_id, contributor_email_hash)
  where contributor_email_hash is not null;
create unique index if not exists contributions_organizer_uniq
  on contributions (collection_id)
  where is_organizer;

-- Feedback for the metrics dashboard. collection_id is a nullable FK so a row
-- cascade-purges with its collection when the txn maps; product + transaction_id
-- keep it queryable otherwise. (Also auto-created on demand by src/lib/metrics.ts.)
create table if not exists collection_feedback (
  id             bigint      generated always as identity primary key,
  collection_id  uuid        references collections (id) on delete cascade,
  product        text        not null,
  transaction_id text,
  rating         int,
  feedback       text,
  can_share      boolean,
  created_at     timestamptz not null default now()
);
create index if not exists collection_feedback_product_idx on collection_feedback (product);
