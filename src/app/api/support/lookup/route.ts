import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ProductConfig } from '@eilon-shai/venture-core/types';
import { getDbClient } from '@eilon-shai/venture-core/db';
import { getConfig, OCCASIONS } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Support console — look up a customer's collections by email across ALL live
// occasions (each result carries its occasion so the UI can group them). An
// optional `occasion` narrows to one. With NO email, returns the most recent
// collections across all occasions (a "show all recent" view, capped).
//
// SECURITY: this returns admin/share tokens (so support can restore links), so
// the whole /support surface + /api/support/* MUST be behind the middleware
// Basic-Auth. There is no app-level auth here by design.
// ---------------------------------------------------------------------------

export const maxDuration = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALL_LIMIT = 200; // cap for the no-email "show all recent" view

interface Row {
  id: string;
  product: string;
  honoree_name: string;
  organizer_email: string | null;
  status: string;
  paid_at: string | null;
  created_at: string | null;
  deadline: string | null;
  admin_token: string;
  share_token: string;
  has_content: boolean;
}

function base(domain: string): string {
  return domain.startsWith('http') ? domain.replace(/\/$/, '') : `https://${domain}`;
}

export async function POST(req: NextRequest) {
  let body: { occasion?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Email is optional: empty → "show all recent" across occasions. A non-empty
  // value must look like an email (typo guard); blank means no filter.
  const email = (body.email ?? '').trim().toLowerCase();
  const all = email === '';
  if (!all && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email (or leave it blank to show all)' }, { status: 400 });
  }

  // Live occasions with a collection flow. Optional `occasion` narrows to one.
  const wanted = (body.occasion ?? '').trim();
  const live = OCCASIONS.filter((o) => o.live)
    .map((o) => ({ occasion: o.slug, title: o.title, config: getConfig(o.slug) }))
    .filter((x): x is { occasion: string; title: string; config: ProductConfig } => !!x.config?.collectionConfig)
    .filter((x) => !wanted || x.occasion === wanted);

  if (live.length === 0) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });

  // Map each occasion's Paddle product id → its occasion + config, so a row can
  // be tagged back to its occasion (the cross-product isolation key).
  const byProduct = new Map(live.map((x) => [x.config.brand.paddleProductId, x]));
  const productIds = [...byProduct.keys()];

  const db = getDbClient();
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  try {
    const select = `select id, product, honoree_name, organizer_email, status, paid_at, created_at, deadline, admin_token, share_token,
              (generated_content is not null) as has_content
         from collections
        where product = ANY($1::text[])`;
    const rows = all
      ? await db.query<Row>(`${select} order by created_at desc limit ${ALL_LIMIT}`, [productIds])
      : await db.query<Row>(
          `${select} and lower(organizer_email) = lower($2) order by created_at desc limit 100`,
          [productIds, email],
        );
    const collections = rows
      .map((r) => {
        const match = byProduct.get(r.product);
        if (!match) return null; // row's product isn't a live occasion (defensive)
        const origin = base(match.config.brand.domain);
        return {
          id: r.id,
          occasion: match.occasion,
          occasionTitle: match.title,
          honoreeName: r.honoree_name,
          organizerEmail: r.organizer_email,
          status: r.status,
          paid: !!r.paid_at,
          createdAt: r.created_at,
          deadline: r.deadline,
          generated: r.status === 'generated',
          hasTribute: r.status === 'generated' && r.has_content,
          adminToken: r.admin_token,
          manageUrl: `${origin}/collect/manage?t=${r.admin_token}`,
          tributeUrl: `${origin}${match.config.brand.resultPath}?t=${r.admin_token}`,
          shareUrl: `${origin}/c/${r.share_token}`,
        };
      })
      .filter(Boolean);
    return NextResponse.json({ collections });
  } catch (err) {
    console.error('[support/lookup] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
