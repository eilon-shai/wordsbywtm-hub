'use client';

// ---------------------------------------------------------------------------
// Edit/Refine Pack — optional one-time upsell (COLLECTION_SCREENS_REDESIGN §4)
//
// Rendered ONLY when a Paddle price id is configured (passed from the server
// page, which reads NEXT_PUBLIC_PADDLE_PRICE_ID_MEMORIAL_EDITPACK). When no
// price id exists this component is never mounted — we never imply a regen
// path that doesn't exist.
//
// This round is presentational + checkout-open only. The server-side regen
// wiring (webhook → per-collection Redis regen credits → server-gated
// re-synthesis) is a flagged backend follow-up. The card must NOT imply that
// instant regeneration already works.
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import {
  initSharedPaddle,
  getSharedPaddle,
  setActiveTransaction,
} from '@eilon-shai/venture-core/components';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from '@eilon-shai/venture-core/ui';

interface EditPackCardProps {
  /** Paddle price id for the one-time edit pack. Always set when mounted. */
  priceId: string;
  /** brand.resultPath of the resolved occasion, e.g. '/memorial/result'. */
  resultPath: string;
  /** What the finished piece is called for this occasion ("tribute" | "toast" | …). */
  deliverableNoun?: string;
}

export function EditPackCard({ priceId, resultPath, deliverableNoun }: EditPackCardProps) {
  const noun = (deliverableNoun ?? '').trim() || 'tribute';
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    if (opening) return;
    setError(null);
    setOpening(true);
    try {
      // Reuse the shared Paddle pattern (initSharedPaddle / setActiveTransaction
      // / getSharedPaddle / Checkout.open). Open an inline-price checkout for the
      // edit pack. Backend credit-grant on webhook is the follow-up; opening the
      // overlay does not yet trigger any regeneration.
      await initSharedPaddle(resultPath);
      const paddle = await getSharedPaddle();
      setActiveTransaction(`editpack_${priceId}`, 'basic', resultPath);
      paddle.Checkout.open({ items: [{ priceId, quantity: 1 }] });
      // Overlay is open; keep the page interactive behind it.
      setOpening(false);
    } catch {
      setError("Checkout couldn't start — please try again. You haven't been charged.");
      setOpening(false);
    }
  }, [opening, priceId, resultPath]);

  return (
    <div className="mx-auto mt-10 max-w-2xl px-4 pb-16">
      <Card className="border-accent/50 bg-accent/20">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Adjust this {noun}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Want a different feel? The one-time Edit &amp; Refine pack lets you
            regenerate this {noun} with a different tone or length, or fold in a
            memory that arrived late. One payment, no subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            onClick={handleOpen}
            disabled={opening}
            className="w-full sm:w-auto"
          >
            {opening ? 'Opening checkout…' : 'Get the Edit & Refine pack'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Refinements are applied after purchase. The original {noun} above
            stays available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
