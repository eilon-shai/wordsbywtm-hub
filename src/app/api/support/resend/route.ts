import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDbClient, getCollectionByAdminToken, getGeneratedContentByAdminToken } from '@eilon-shai/venture-core/db';
import { getResendClient, sendEmail } from '@eilon-shai/venture-core/email';
import { getConfig } from '@/lib/registry';

// Support console — re-send a customer their collection (manage) link or their
// tribute link, by admin token. Also returns the URL so the operator can copy it.
// MUST sit behind Vercel Password Protection (see lookup route).

export const maxDuration = 30;

function base(domain: string): string {
  return domain.startsWith('http') ? domain.replace(/\/$/, '') : `https://${domain}`;
}

export async function POST(req: NextRequest) {
  let body: { occasion?: string; adminToken?: string; kind?: 'collection' | 'tribute' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const config = getConfig((body.occasion ?? '').trim());
  const cc = config?.collectionConfig;
  const adminToken = (body.adminToken ?? '').trim();
  const kind = body.kind === 'tribute' ? 'tribute' : 'collection';
  if (!config || !cc) return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  if (!adminToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const db = getDbClient();
  if (!db) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
  if (!collection || collection.product !== config.brand.paddleProductId) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  const origin = base(config.brand.domain);
  const manageUrl = `${origin}/collect/manage?t=${adminToken}`;
  const tributeUrl = `${origin}${config.brand.resultPath}?t=${adminToken}`;

  const resend = getResendClient();
  let emailed = false;

  try {
    if (kind === 'collection') {
      const payload = cc.buildAdminLinkEmail({
        to: collection.organizerEmail,
        honoreeName: collection.honoreeName,
        adminUrl: manageUrl,
      });
      if (resend) {
        await sendEmail(resend, payload);
        emailed = true;
      }
      return NextResponse.json({ ok: true, emailed, url: manageUrl, to: collection.organizerEmail });
    }

    // tribute: only meaningful once generated. Send a short email with the link
    // back to the tribute page (not the whole deliverable).
    const generated = await getGeneratedContentByAdminToken(db, adminToken).catch(() => null);
    if (!generated) {
      return NextResponse.json({ error: 'No tribute generated for this collection yet.', code: 'NOT_GENERATED' }, { status: 409 });
    }
    if (resend) {
      await sendEmail(resend, {
        from: config.email.fromEmail,
        to: collection.organizerEmail,
        subject: `Your tribute for ${collection.honoreeName}`,
        html: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2a2118;line-height:1.6;">
          <p>Here's the link to view your tribute for <strong>${collection.honoreeName}</strong>:</p>
          <p style="margin:24px 0;"><a href="${tributeUrl}" style="background:${config.email.brandColor};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;">View your tribute</a></p>
          <p style="font-size:13px;color:#8c7c68;">Or paste this into your browser:<br>${tributeUrl}</p>
        </div>`,
        text: `View your tribute for ${collection.honoreeName}: ${tributeUrl}`,
      });
      emailed = true;
    }
    return NextResponse.json({ ok: true, emailed, url: tributeUrl, to: collection.organizerEmail });
  } catch (err) {
    console.error('[support/resend] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not send the link' }, { status: 500 });
  }
}
