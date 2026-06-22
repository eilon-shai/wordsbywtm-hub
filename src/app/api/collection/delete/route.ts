import { NextRequest, NextResponse } from 'next/server';
import { createDeleteCollectionHandler } from '@eilon-shai/venture-core/api';
import { getDbClient, getCollectionByAdminToken } from '@eilon-shai/venture-core/db';
import { resolveForTokenPost } from '@/lib/route-helpers';

export const maxDuration = 60;

// POST /api/collection/delete — admin-token scoped. Hard-deletes the collection
// and everything under it (contributor memories + the generated tribute in
// `generated_content` + audio, all ON DELETE CASCADE).
//
// Deletion rules:
//   • Unpaid / open              → deletable (no confirm needed).
//   • Paid AND already GENERATED → deletable WITH `{ confirmPaidDeletion: true }`.
//       The final results page lets the customer remove their collection + tribute
//       once they have it.
//   • Paid but NOT yet generated → ALWAYS forbidden (409), even with the confirm
//       flag. The organizer paid for a deliverable they haven't received yet, so a
//       stray/confirmed delete must not wipe it out before it's created.
//
// The venture-core handler honors `confirmPaidDeletion` for ANY paid collection,
// so this wrapper adds the generated-only gate before delegating.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const resolved = await resolveForTokenPost(request, 'adminToken', 'admin');
  if (resolved instanceof NextResponse) return resolved;

  let confirmPaidDeletion = false;
  let adminToken = '';
  try {
    const body = (await request.clone().json()) as {
      adminToken?: unknown;
      confirmPaidDeletion?: unknown;
    };
    confirmPaidDeletion = body.confirmPaidDeletion === true;
    adminToken = typeof body.adminToken === 'string' ? body.adminToken : '';
  } catch {
    // Unparseable body — let the core handler return its own 400.
  }

  // Protect a paid-but-not-yet-generated collection from confirmed deletion.
  if (confirmPaidDeletion && adminToken) {
    const db = getDbClient();
    if (db) {
      const collection = await getCollectionByAdminToken(db, adminToken).catch(() => null);
      if (collection && collection.paidAt && collection.status !== 'generated') {
        return NextResponse.json(
          {
            error:
              'This collection has been paid for but hasn’t been finalized yet, so it can’t be deleted. ' +
              'Finalize it to create your tribute first, or contact support if you need it removed.',
            code: 'PAID_NOT_GENERATED',
            retryable: false,
          },
          { status: 409 },
        );
      }
    }
  }

  return createDeleteCollectionHandler(resolved)(request);
}
