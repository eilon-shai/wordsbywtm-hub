'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { OrganizerMemoryForm } from './OrganizerMemoryForm';
import { InviteBlock } from './InviteBlock';
import { buildShareLink, buildInviteText } from '@/lib/invite';

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
  /** Paid in advance (from the invite panel) — finalize is then free. */
  paid?: boolean;
  /** Max invite emails/day (10 if paid, else 3). */
  inviteCap?: number;
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
  /** True right after creation (?new=1) — show a "ready, invite people" banner. */
  justCreated?: boolean;
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
      return { label: 'Tribute created', variant: 'secondary' };
    case 'closed':
      return { label: 'Closed', variant: 'outline' };
    default:
      // Status indicator, not an action — outline + a dot so it doesn't read as a button.
      return { label: 'Collecting memories', variant: 'outline' };
  }
}

export function ManageDashboard({ adminToken, resultPath, occasion, justCreated = false }: ManageDashboardProps) {
  const [data, setData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  // Per-contribution save state for optimistic toggles.
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const termsRef = useRef<HTMLLabelElement | null>(null);

  // Inline edit of the organizer's own memory.
  // The contribution being edited (organizer's own memory) — opens the rich
  // customer form, pre-populated from its stored structured fields.
  const [editing, setEditing] = useState<Contribution | null>(null);
  const openEdit = useCallback((c: Contribution) => setEditing(c), []);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/collection/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminToken }),
      });
      if (!res.ok) throw new Error('delete failed');
      setDeleted(true);
    } catch {
      setDeleteError('Could not delete the collection. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [adminToken]);

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
    if (!termsAccepted) {
      setTermsError(true);
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFinalizing(true);
    setFinalizeError(null);

    // Stash the occasion so the result page can resolve/theme without a token.
    try {
      sessionStorage.setItem('wtm:occasion', occasion);
    } catch {
      /* sessionStorage may be unavailable; result page falls back to txn resolution */
    }

    // Already paid in advance → no checkout. Go straight to the result page in
    // paid-finalize mode (prefs step → /api/collection/finalize-paid, no charge).
    if (data.paid) {
      window.location.href = `${resultPath}?t=${encodeURIComponent(adminToken)}`;
      return;
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
  }, [adminToken, data, finalizing, load, occasion, resultPath, termsAccepted]);

  // --- Render --------------------------------------------------------------
  if (deleted) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-serif text-2xl text-foreground">Collection deleted</h1>
        <p className="mt-3 text-muted-foreground">
          Your collection and every memory in it have been permanently removed.
        </p>
        <a href="/" className={`${buttonVariants({ size: 'lg' })} mt-6`}>Back to home</a>
      </div>
    );
  }

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
  // The organizer's own memory exists once any contribution is flagged isOrganizer.
  const hasOrganizerMemory = data.contributions.some((c) => c.isOrganizer);
  const badge = statusBadge(data.status);
  const deadline = formatDeadline(data.deadline);
  const price = data.priceShown ? `$${data.priceShown}` : null;
  const progressValue = data.minContributions
    ? Math.min(100, Math.round((includedCount / data.minContributions) * 100))
    : 100;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareLink = buildShareLink(origin, data.shareToken, data.occasion);
  const inviteText = buildInviteText(data.honoreeName, shareLink);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `Add a memory for ${data.honoreeName}`,
  )}&body=${encodeURIComponent(inviteText)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Edit-your-memory modal — the full customer form, pre-populated. */}
      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10"
          role="dialog"
          aria-modal="true"
          aria-label="Edit your memory"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
        >
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <h3 className="mb-4 font-serif text-xl text-foreground">Edit your memory</h3>
              <OrganizerMemoryForm
                mode="edit"
                adminToken={adminToken}
                contributionId={editing.id}
                honoreeLabel={data.honoreeName}
                initial={{
                  contributorName: editing.contributorName,
                  relationship: editing.relationship ?? editing.fields?.relationship ?? '',
                  relationshipDescription: editing.fields?.relationshipDescription ?? '',
                  qualities: editing.fields?.qualities ?? '',
                  favoriteMoment: editing.fields?.favoriteMoment ?? '',
                  // Older memories have no structured fields — fall back to the
                  // stored (composed) text so nothing is lost.
                  rawMemory: editing.fields?.rawMemory ?? editing.memory,
                }}
                onSaved={() => {
                  setEditing(null);
                  void load();
                }}
                onCancel={() => setEditing(null)}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Just-created banner — replaces the old standalone invite page: leads with
          "invite people" + the emailed-link reassurance. */}
      {justCreated && !generated ? (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="font-serif text-lg text-foreground">Your collection is ready 🤍</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your invite link below to gather memories of {data.honoreeName}. We’ve also emailed you
            this private link — it’s how you’ll come back to review and finalize.
          </p>
        </div>
      ) : null}

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

      {/* Add your own memory — only while the organizer hasn't added theirs yet
          (e.g. they chose "write later" at create). Once it exists it's pinned
          above with its own Edit button, so this prompt would be redundant. */}
      {!generated && !hasOrganizerMemory ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Add your own memory</p>
              <p className="text-sm text-muted-foreground">Share a memory of {data.honoreeName} yourself.</p>
            </div>
            <a
              href={`/c/${data.shareToken}?occasion=${data.occasion}&as=organizer&t=${encodeURIComponent(adminToken)}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Write a memory
            </a>
          </CardContent>
        </Card>
      ) : null}

      {/* Invite more people (any time before finalizing) */}
      {!generated ? (
        <Card className="mt-4">
          <CardContent className="p-5">
            <InviteBlock
              surface="dashboard"
              adminToken={adminToken}
              shareLink={shareLink}
              inviteText={inviteText}
              whatsappUrl={whatsappUrl}
              emailUrl={emailUrl}
              paid={!!data.paid}
              price={price}
            />
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
            <a href={`${resultPath}?t=${encodeURIComponent(adminToken)}`} className={buttonVariants({ size: 'lg' })}>
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
          [...data.contributions]
            .sort((a, b) => Number(b.isOrganizer ?? false) - Number(a.isOrganizer ?? false))
            .map((c) => (
              <MemoryCard
                key={c.id}
                contribution={c}
                included={isIncluded(c)}
                disabled={generated || savingIds.has(c.id)}
                onToggle={handleToggle}
                onEdit={openEdit}
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

            {/* Pay-time consent waiver (matches TributeWords). Required before checkout. */}
            <label
              ref={termsRef}
              className={`mt-5 flex w-fit max-w-full items-start gap-2 rounded-lg p-2 cursor-pointer text-sm text-muted-foreground ${
                termsError ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (e.target.checked) setTermsError(false);
                }}
                disabled={finalizing}
                className="mt-0.5 h-4 w-4 rounded border-border"
                aria-label="Agree to terms and start delivery"
              />
              <span>
                By paying, you agree to our{' '}
                <a href="/terms" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
                  terms
                </a>{' '}
                and{' '}
                <a href="/privacy" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
                  privacy policy
                </a>
                . By clicking pay, I agree to start delivery immediately and understand this waives my EU 14-day withdrawal right.
              </span>
            </label>

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
                  ? data.paid
                    ? 'Creating the tribute…'
                    : 'Starting checkout…'
                  : data.paid
                    ? 'Finalize & create the tribute' // already paid in advance — no charge
                    : price
                      ? `Pay & finalize — ${price}`
                      : 'Pay & finalize'}
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

      {/* Danger zone — delete the whole collection (cascades to all memories). */}
      <div className="mt-10 border-t border-border pt-6">
        {!confirmDelete ? (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => setConfirmDelete(true)}
          >
            Delete this collection
          </button>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Delete this collection and all {data.count} {data.count === 1 ? 'memory' : 'memories'}?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This permanently removes everything contributors shared. It can’t be undone.
            </p>
            {deleteError ? <p className="mt-2 text-sm text-destructive" role="alert">{deleteError}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                Keep collection
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
