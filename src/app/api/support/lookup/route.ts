import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDbClient } from '@eilon-shai/venture-core/db';
import { getConfig } from '@/lib/registry';

// ---------------------------------------------------------------------------
// Support console — look up a customer's collections by email + product.
//
// SECURITY: this returns admin/share tokens (so support can restore links), so
// the whole /support surface + /api/support/* MUST be behind Vercel Password
// Protection (platform-level). There is no app-level auth here by design.
// ---------------------------------------------------------------------------

export const maxDuration = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Row {
  id: string;
  honoree_name: string;
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

  const email = (body.email ?? '').trim().toLowerCase();
  const config = getConfig((body.occasion ?? '').trim());
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
  if (!config?.collectionConfig) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });

  const db = getDbClient();
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  try {
    const rows = await db.query<Row>(
      `select id, honoree_name, status, paid_at, created_at, deadline, admin_token, share_token,
              (generated_content is not null) as has_content
         from collections
        where product = $1 and lower(organizer_email) = lower($2)
        order by created_at desc
        limit 50`,
      [config.brand.paddleProductId, email],
    );
    const origin = base(config.brand.domain);
    const collections = rows.map((r) => ({
      id: r.id,
      honoreeName: r.honoree_name,
      status: r.status,
      paid: !!r.paid_at,
      createdAt: r.created_at,
      deadline: r.deadline,
      generated: r.status === 'generated',
      // The tribute is restorable only while its content is still stored (it's
      // removed at the retention purge). generated-but-empty ⇒ dead link.
      hasTribute: r.status === 'generated' && r.has_content,
      adminToken: r.admin_token,
      manageUrl: `${origin}/collect/manage?t=${r.admin_token}`,
      tributeUrl: `${origin}${config.brand.resultPath}?t=${r.admin_token}`,
      shareUrl: `${origin}/c/${r.share_token}`,
    }));
    return NextResponse.json({ collections });
  } catch (err) {
    console.error('[support/lookup] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
