'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Progress,
  Separator,
  buttonVariants,
} from '@eilon-shai/venture-core/ui';
import {
  initSharedPaddle,
  getSharedPaddle,
  setActiveTransaction,
} from '@eilon-shai/venture-core/components';
import { MemoryCard, type Contribution } from './MemoryCard';
import { DirectInvite } from './InviteScreen';

// ---------------------------------------------------------------------------
// S6 + S7 — Organizer review dashboard + finalize.
//
// GETs /api/collection?t={adminToken} (get-collection-handler), renders every
// memory with an opt-out Include toggle (optimistic, rollback on moderate
// failure), shows the live "woven from N memories" bar, and finalizes via
// /api/collection/checkout. Output is NEVER shown here — synthesis happens only
// after payment on the result page. See COLLECTION_FLOW_DESIGN.md §3, §S6/§S7.
// ---------------------------------------------------------------------------

interface CollectionData {
  honoreeName: string;
  occasion: string;
  status: string;
  deadline?: string | null;
  priceShown?: number | null;
  shareToken: string;
  count: number;
  minContributions: number;
  canFinalize: boolean;
  contributions: Contribution[];
}

interface ApiError {
  error: string;
  code?: string;
  retryable?: boolean;
}

interface ManageDashboardProps {
  adminToken: string;
  /** brand.resultPath of the resolved occasion config, e.g. '/memorial/result'. */
  resultPath: string;
  /** Occasion slug — stashed in sessionStorage so the result page can theme/resolve. */
  occasion: string;
}

const isIncluded = (c: Contribution) => c.status !== 'removed';

function formatDeadline(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: string): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  switch (status) {
    case 'generated':
      return { label: 'Generated', variant: 'secondary' };
    case 'closed':
      return { label: 'Closed', variant: 'outline' };
    default:
      return { label: 'Open', variant: 'default' };
  }
}

export function ManageDashboard({ adminToken, resultPath, occasion }: ManageDashboardProps) {
  const [data, setData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  // Per-contribution save state for optimistic toggles.
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/collection?t=${encodeURIComponent(adminToken)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json as ApiError);
        return;
      }
      setData(json as CollectionData);
    } catch {
      setLoadError({ error: 'Service unavailable', code: 'INVALID_SESSION', retryable: true });
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Optimistic include/exclude -----------------------------------------
  const handleToggle = useCallback(
    async (id: string, nextIncluded: boolean) => {
      if (!data) return;

      // Optimistic update.
      const nextStatus = nextIncluded ? 'approved' : 'removed';
      setData((prev) =>
        prev
          ? {
              ...prev,
              contributions: prev.contributions.map((c) =>
                c.id === id ? { ...c, status: nextStatus } : c,
              ),
            }
          : prev,
      );
      setToggleErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSavingIds((prev) => new Set(prev).add(id));

      try {
        const res = await fetch('/api/collection/moderate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            adminToken,
            contributionId: id,
            action: nextIncluded ? 'restore' : 'remove',
          }),
        });
        if (!res.ok) throw new Error('save failed');
      } catch {
        // Rollback.
        const revertStatus = nextIncluded ? 'removed' : 'approved';
        setData((prev) =>
          prev
            ? {
                ...prev,
                contributions: prev.contributions.map((c) =>
                  c.id === id ? { ...c, status: revertStatus } : c,
                ),
              }
            : prev,
        );
        setToggleErrors((prev) => ({ ...prev, [id]: "Couldn't save — tap to retry." }));
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [adminToken, data],
  );

  // --- Finalize / checkout -------------------------------------------------
  const handleFinalize = useCallback(async () => {
    if (!data || finalizing) return;
    setFinalizing(true);
    setFinalizeError(null);

    // Stash the occasion so the result page can resolve/theme without a token.
    try {
      sessionStorage.setItem('wtm:occasion', occasion);
    } catch {
      /* sessionStorage may be unavailable; result page falls back to txn resolution */
    }

    try {
      const res = await fetch('/api/collection/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminToken }),
      });
      const json = await res.json();

      if (!res.ok) {
        const err = json as ApiError;
        if (err.code === 'ALREADY_USED') {
          // Already finalized — refresh into the read-only "view your tribute" state.
          await load();
          setFinalizing(false);
          return;
        }
        if (err.code === 'NOT_ENOUGH_CONTRIBUTIONS') {
          setFinalizeError('You need a few more memories before you can finalize.');
        } else {
          setFinalizeError(
            "Payment couldn't start — please try again. You haven't been charged.",
          );
        }
        setFinalizing(false);
        return;
      }

      const { transactionId, redirectUrl } = json as {
        transactionId?: string;
        redirectUrl?: string;
      };

      // Mock mode: synthetic txn + redirectUrl.
      if (transactionId && transactionId.startsWith('mock_')) {
        window.location.href =
          redirectUrl ?? `${resultPath}?txn=${encodeURIComponent(transactionId)}`;
        return;
      }

      // Real mode: open the Paddle overlay. The shared event callback redirects to
      // `${formPath}?txnId=...` on checkout.completed — point formPath at resultPath.
      if (transactionId) {
        await initSharedPaddle(resultPath);
        setActiveTransaction(transactionId, 'basic', resultPath);
        const paddle = await getSharedPaddle();
        paddle.Checkout.open({ transactionId });
        // Overlay is open; clear the spinner so the page stays interactive behind it.
        setFinalizing(false);
        return;
      }

      setFinalizeError("Payment couldn't start — please try again. You haven't been charged.");
      setFinalizing(false);
    } catch {
      setFinalizeError("Payment couldn't start — please try again. You haven't been charged.");
      setFinalizing(false);
    }
  }, [adminToken, data, finalizing, load, occasion, resultPath]);

  // --- Render --------------------------------------------------------------
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (loadError) {
    const notFound = loadError.code === 'NOT_FOUND' || loadError.code === 'INVALID_SESSION';
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-serif text-2xl text-foreground">We couldn&apos;t open this collection</h1>
        <p className="mt-3 text-muted-foreground">
          {notFound
            ? 'Please use the private manage link from the email we sent you.'
            : 'Something went wrong on our end. Your collection is safe.'}
        </p>
        <Button className="mt-6" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const includedCount = data.contributions.filter(isIncluded).length;
  const remaining = Math.max(0, data.minContributions - includedCount);
  const belowMin = includedCount < data.minContributions;
  const generated = data.status === 'generated';
  const badge = statusBadge(data.status);
  const deadline = formatDeadline(data.deadline);
  const price = data.priceShown ? `$${data.priceShown}` : null;
  const progressValue = data.minContributions
    ? Math.min(100, Math.round((includedCount / data.minContributions) * 100))
    : 100;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/c/${data.shareToken}`
      : `/c/${data.shareToken}`;
  const shareLink = `${shareUrl}?occasion=${data.occasion}&src=invite`;
  const inviteText = `I'm putting together a tribute for ${data.honoreeName} — add a memory here, takes 2 minutes: ${shareLink}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="font-serif text-2xl">
              {data.honoreeName}
            </CardTitle>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{data.count}</span>{' '}
            {data.count === 1 ? 'memory' : 'memories'} collected
          </p>

          {!generated ? (
            <div className="space-y-1.5">
              <Progress value={progressValue} aria-label="Progress toward the minimum" />
              <p className="text-sm text-muted-foreground">
                {belowMin
                  ? `${remaining} more ${remaining === 1 ? 'memory' : 'memories'} until you can finalize`
                  : 'Ready to finalize whenever you are'}
              </p>
            </div>
          ) : null}

          {deadline ? (
            <p className="text-sm text-muted-foreground">Memories close {deadline}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Invite more people (any time before finalizing) */}
      {!generated ? (
        <Card className="mt-4">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium text-foreground">Invite more people</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                {shareLink}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void navigator.clipboard?.writeText(shareLink)}
              >
                Copy
              </Button>
            </div>
            <DirectInvite adminToken={adminToken} inviteText={inviteText} />
          </CardContent>
        </Card>
      ) : null}

      {/* Generated read-only state */}
      {generated ? (
        <Card className="mt-4">
          <CardContent className="space-y-4 p-6 text-center">
            <p className="font-serif text-xl text-foreground">Your tribute has been created</p>
            <p className="text-muted-foreground">
              It was woven from {includedCount} {includedCount === 1 ? 'memory' : 'memories'} and emailed to you.
            </p>
            <a href={`${resultPath}`} className={buttonVariants({ size: 'lg' })}>
              View your tribute
            </a>
          </CardContent>
        </Card>
      ) : null}

      {/* Memory list */}
      <div className="mt-8 space-y-4">
        {data.contributions.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="font-serif text-lg text-foreground">No memories yet</p>
              <p className="mt-2 text-muted-foreground">
                Share your invite link above and memories will appear here as they come in.
              </p>
            </CardContent>
          </Card>
        ) : (
          data.contributions.map((c) => (
            <MemoryCard
              key={c.id}
              contribution={c}
              included={isIncluded(c)}
              disabled={generated || savingIds.has(c.id)}
              onToggle={handleToggle}
              error={toggleErrors[c.id] ?? null}
            />
          ))
        )}
      </div>

      {/* Live summary + finalize (S7) */}
      {!generated ? (
        <>
          <Separator className="my-8" />
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-center font-serif text-lg text-foreground">
              Your tribute will be woven from{' '}
              <span className="text-primary">{includedCount}</span>{' '}
              {includedCount === 1 ? 'memory' : 'memories'}
            </p>

            <p className="mt-2 text-center text-sm text-muted-foreground">
              Finalizing closes the collection{price ? ` — ${price}, one time` : ''}.
            </p>

            <div className="mt-5 flex flex-col items-center gap-2">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                disabled={belowMin || finalizing}
                onClick={() => void handleFinalize()}
                title={
                  belowMin
                    ? `Add ${remaining} more ${remaining === 1 ? 'memory' : 'memories'} to finalize`
                    : undefined
                }
              >
                {finalizing
                  ? 'Starting checkout…'
                  : price
                    ? `Finalize & create the tribute — ${price}`
                    : 'Finalize & create the tribute'}
              </Button>
              {belowMin ? (
                <p className="text-sm text-muted-foreground">
                  Add {remaining} more {remaining === 1 ? 'memory' : 'memories'} to finalize.
                </p>
              ) : null}
              {finalizeError ? (
                <p className="text-sm text-destructive" role="alert">
                  {finalizeError}
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
